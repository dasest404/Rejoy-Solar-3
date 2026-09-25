import { storageService } from './storage';
import { pusherService } from './pusherService';
import {
  LiveEmployeeLocation,
  WorkforceLiveStatus,
  ELIGIBLE_FIELD_ROLES,
  LocationUpdatePayload,
  PresenceUpdatePayload,
  PRESENCE_TIMEOUT_MS
} from '../types/tracking';

const REAL_LOCATIONS_STORAGE_KEY = 'solarpulse_real_employee_locations_v1';

// Haversine formula to calculate accurate distance between coordinates (in km)
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

// Convert relative timestamp to human readable format ("Just now", "8 sec ago", etc.)
export function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'No updates';
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (isNaN(diffMs)) return 'Recently';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec} sec ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hr ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

class LiveLocationService {
  private employeeLocations: Map<string, LiveEmployeeLocation> = new Map();
  // Alias map to resolve by email, employeeCode, or authUid to the primary employee id
  private alternateIdMap: Map<string, string> = new Map();
  private listeners: Set<(locations: LiveEmployeeLocation[]) => void> = new Set();
  private unsubscribeLocationPusher: (() => void) | null = null;
  private unsubscribePresencePusher: (() => void) | null = null;
  private staleCheckTimer: any = null;
  private isInitialFetched = false;

  constructor() {
    this.initializeFieldWorkers();

    // 1. Listen to real-time location stream from Pusher
    this.unsubscribeLocationPusher = pusherService.onLocationUpdate((payload) => {
      this.handleIncomingLocation(payload);
    });

    // 2. Listen to real-time presence stream from Pusher
    this.unsubscribePresencePusher = pusherService.onPresenceUpdate((payload) => {
      this.handleIncomingPresence(payload);
    });

    // 3. Periodic stale presence checker (marks offline if heartbeat expires)
    if (typeof window !== 'undefined') {
      this.staleCheckTimer = setInterval(() => {
        this.checkStaleLocations();
      }, 15000);

      // Perform initial load from server
      this.fetchServerLocations();
    }
  }

  // Check whether an employee role is eligible for field tracking
  isEligibleFieldWorker(role: string, department?: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase().trim();
    const normalizedDept = (department || '').toLowerCase().trim();

    // Disqualify customer and office-only roles
    if (
      normalizedRole.includes('customer') ||
      normalizedRole.includes('accountant') ||
      normalizedRole.includes('finance') ||
      normalizedRole.includes('hr') ||
      normalizedRole.includes('director') ||
      normalizedRole.includes('executive assistant') ||
      normalizedDept.includes('hr') ||
      normalizedDept.includes('finance') ||
      normalizedDept.includes('accounting')
    ) {
      return false;
    }

    // Match against eligible field worker titles
    return (
      ELIGIBLE_FIELD_ROLES.some((r) =>
        normalizedRole.includes(r.toLowerCase())
      ) ||
      normalizedDept.includes('engineering') ||
      normalizedDept.includes('operation') ||
      normalizedDept.includes('installation') ||
      normalizedDept.includes('electrical') ||
      normalizedDept.includes('civil') ||
      normalizedDept.includes('structure') ||
      normalizedDept.includes('service')
    );
  }

  /**
   * Resolves any user identifier (emp-id, email, code, auth uid) to canonical employee ID
   */
  private resolveCanonicalId(rawId: string): string {
    if (!rawId) return rawId;
    if (this.employeeLocations.has(rawId)) return rawId;
    const clean = rawId.trim().toLowerCase();
    if (this.alternateIdMap.has(clean)) {
      return this.alternateIdMap.get(clean)!;
    }
    return rawId;
  }

  private initializeFieldWorkers() {
    const allEmployees = storageService.getEmployees();
    const allProjects = storageService.getProjects();

    // Load any cached locations from previous local session
    let savedLocations: Record<string, Partial<LiveEmployeeLocation>> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(REAL_LOCATIONS_STORAGE_KEY);
        if (raw) {
          savedLocations = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Could not read saved locations from storage:', e);
      }
    }

    const fieldWorkers = allEmployees.filter((emp) =>
      this.isEligibleFieldWorker(emp.systemRole || emp.designation, emp.department)
    );

    fieldWorkers.forEach((emp) => {
      // Map alternate IDs for robust identification across devices & login types
      this.alternateIdMap.set(emp.id.toLowerCase(), emp.id);
      if (emp.employeeCode) {
        this.alternateIdMap.set(emp.employeeCode.toLowerCase(), emp.id);
      }
      if (emp.email) {
        this.alternateIdMap.set(emp.email.toLowerCase(), emp.id);
      }
      if (emp.authUid) {
        this.alternateIdMap.set(emp.authUid.toLowerCase(), emp.id);
      }

      // Find assigned solar project if available
      const assignedProject = allProjects.find(
        (p) =>
          p.projectManagerId === emp.id ||
          (p.assignedUsers && p.assignedUsers.some((u) => u.userId === emp.id))
      );

      // Check for real GPS fix from saved cache
      const cached = savedLocations[emp.id];
      const hasRealCoordinates =
        cached &&
        typeof cached.latitude === 'number' &&
        typeof cached.longitude === 'number';

      const lastSeenMs = cached?.lastSeenAt ? new Date(cached.lastSeenAt).getTime() : 0;
      const isOnline = Date.now() - lastSeenMs < PRESENCE_TIMEOUT_MS;

      const record: LiveEmployeeLocation = {
        userId: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        email: emp.email,
        role: emp.systemRole || emp.designation,
        avatar: emp.photoUrl,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,

        isOnline,
        isSharingLocation: cached?.isSharingLocation ?? false,
        lastSeenAt: cached?.lastSeenAt,

        latitude: hasRealCoordinates ? cached.latitude : undefined,
        longitude: hasRealCoordinates ? cached.longitude : undefined,
        hasLocation: Boolean(hasRealCoordinates),

        accuracy: hasRealCoordinates ? cached.accuracy : undefined,
        heading: hasRealCoordinates ? cached.heading : undefined,
        speed: hasRealCoordinates ? cached.speed : undefined,
        updatedAt: cached?.updatedAt || new Date().toISOString(),

        status: !isOnline
          ? 'offline'
          : hasRealCoordinates
          ? ((cached?.speed || 0) > 3 ? 'moving' : 'idle')
          : 'online',

        batteryLevel: cached?.batteryLevel,
        currentActivity: !hasRealCoordinates
          ? (isOnline ? 'Online • Location Standby' : 'Location unavailable')
          : cached?.currentActivity || 'Field Operations',
        lastLocationAddress: cached?.lastLocationAddress
      };

      if (assignedProject) {
        record.assignedProjectId = assignedProject.id;
        record.assignedProjectCode = assignedProject.projectCode;
        record.assignedProjectTitle = `${assignedProject.capacityKw} kW ${assignedProject.systemType || 'Solar EPC'} - ${assignedProject.customerName}`;
        record.assignedCustomerName = assignedProject.customerName;
        record.assignedSiteAddress = assignedProject.siteAddress || assignedProject.city;

        if (assignedProject.latitude && assignedProject.longitude) {
          record.assignedSiteCoordinates = {
            latitude: assignedProject.latitude,
            longitude: assignedProject.longitude
          };
          if (record.hasLocation && record.latitude !== undefined && record.longitude !== undefined) {
            record.distanceToSiteKm = calculateDistanceKm(
              record.latitude,
              record.longitude,
              assignedProject.latitude,
              assignedProject.longitude
            );
          }
        }
      }

      this.employeeLocations.set(emp.id, record);
    });
  }

  /**
   * Admin Initial Load: Fetch latest known locations & presence from central server
   */
  async fetchServerLocations(): Promise<void> {
    try {
      const res = await fetch('/api/workforce/locations');
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !Array.isArray(data.locations)) return;

      data.locations.forEach((srv: any) => {
        if (!srv || !srv.userId) return;
        const targetId = this.resolveCanonicalId(srv.userId);
        const existing = this.employeeLocations.get(targetId);

        const hasCoords = typeof srv.latitude === 'number' && typeof srv.longitude === 'number';
        const now = Date.now();
        const lastSeenMs = srv.lastSeenAt ? new Date(srv.lastSeenAt).getTime() : 0;
        const isOnline = now - lastSeenMs < PRESENCE_TIMEOUT_MS;

        if (existing) {
          // Avoid race condition: do not overwrite if local state has a strictly newer update
          const localUpdated = new Date(existing.updatedAt).getTime();
          const serverUpdated = new Date(srv.updatedAt || srv.lastSeenAt || 0).getTime();

          if (serverUpdated >= localUpdated || !existing.hasLocation) {
            existing.isOnline = isOnline;
            existing.isSharingLocation = srv.isSharingLocation ?? existing.isSharingLocation;
            existing.lastSeenAt = srv.lastSeenAt || existing.lastSeenAt;

            if (hasCoords) {
              existing.latitude = srv.latitude;
              existing.longitude = srv.longitude;
              existing.hasLocation = true;
              existing.accuracy = srv.accuracy;
              existing.heading = srv.heading;
              existing.speed = srv.speed;
              existing.batteryLevel = srv.batteryLevel ?? existing.batteryLevel;
              existing.currentActivity = srv.activity || existing.currentActivity;
              existing.updatedAt = srv.updatedAt || existing.updatedAt;

              if (existing.assignedSiteCoordinates) {
                existing.distanceToSiteKm = calculateDistanceKm(
                  srv.latitude,
                  srv.longitude,
                  existing.assignedSiteCoordinates.latitude,
                  existing.assignedSiteCoordinates.longitude
                );
              }
            }

            existing.status = !isOnline
              ? 'offline'
              : existing.hasLocation
              ? ((existing.speed || 0) > 3 ? 'moving' : 'idle')
              : 'online';
          }
        } else {
          // Add newly discovered field worker from server
          const newRecord: LiveEmployeeLocation = {
            userId: srv.userId,
            employeeCode: srv.employeeCode,
            name: srv.name || `Field Worker (${srv.userId.slice(0, 6)})`,
            email: srv.email,
            role: srv.role || 'Field Engineer',
            phone: '+91 98250 00000',
            department: 'Operations',
            isOnline,
            isSharingLocation: srv.isSharingLocation ?? true,
            lastSeenAt: srv.lastSeenAt,
            latitude: hasCoords ? srv.latitude : undefined,
            longitude: hasCoords ? srv.longitude : undefined,
            hasLocation: hasCoords,
            accuracy: srv.accuracy,
            heading: srv.heading,
            speed: srv.speed,
            batteryLevel: srv.batteryLevel,
            currentActivity: srv.activity || (isOnline ? 'Active' : 'Offline'),
            updatedAt: srv.updatedAt || new Date().toISOString(),
            status: !isOnline ? 'offline' : hasCoords ? ((srv.speed || 0) > 3 ? 'moving' : 'idle') : 'online'
          };
          this.employeeLocations.set(srv.userId, newRecord);
          this.alternateIdMap.set(srv.userId.toLowerCase(), srv.userId);
        }
      });

      this.isInitialFetched = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('[Workforce] Could not fetch server locations:', err);
    }
  }

  /**
   * Process Real-Time GPS Location updates from Pusher / SSE
   */
  private handleIncomingLocation(payload: LocationUpdatePayload) {
    if (!payload || !payload.userId || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
      return;
    }

    const canonicalId = this.resolveCanonicalId(payload.userId);
    const existing = this.employeeLocations.get(canonicalId);
    const speed = payload.speed !== undefined ? payload.speed : 0;
    const isMoving = speed > 3;
    const timestamp = payload.timestamp || new Date().toISOString();

    let updated: LiveEmployeeLocation;

    if (existing) {
      updated = {
        ...existing,
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasLocation: true,
        isOnline: true,
        isSharingLocation: true,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
        batteryLevel: payload.batteryLevel ?? existing.batteryLevel,
        currentActivity: payload.activity || (isMoving ? 'In Transit / Moving' : 'On Site / Active'),
        updatedAt: timestamp,
        lastSeenAt: timestamp,
        status: isMoving ? 'moving' : 'idle'
      };

      if (updated.assignedSiteCoordinates) {
        updated.distanceToSiteKm = calculateDistanceKm(
          payload.latitude,
          payload.longitude,
          updated.assignedSiteCoordinates.latitude,
          updated.assignedSiteCoordinates.longitude
        );
      }
      this.employeeLocations.set(canonicalId, updated);
    } else {
      // Dynamic worker entry if not previously configured
      updated = {
        userId: payload.userId,
        name: `Field Worker (${payload.userId.slice(0, 6)})`,
        role: 'Technician',
        phone: '+91 98250 00000',
        department: 'Operations',
        isOnline: true,
        isSharingLocation: true,
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasLocation: true,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
        batteryLevel: payload.batteryLevel,
        currentActivity: payload.activity || (isMoving ? 'In Transit' : 'Active'),
        updatedAt: timestamp,
        lastSeenAt: timestamp,
        status: isMoving ? 'moving' : 'idle'
      };
      this.employeeLocations.set(payload.userId, updated);
      this.alternateIdMap.set(payload.userId.toLowerCase(), payload.userId);
    }

    this.persistRealLocation(updated.userId, updated);
    this.notifyListeners();
  }

  /**
   * Process Real-Time Presence updates from Pusher / SSE
   */
  private handleIncomingPresence(payload: PresenceUpdatePayload) {
    if (!payload || !payload.userId) return;

    const canonicalId = this.resolveCanonicalId(payload.userId);
    const existing = this.employeeLocations.get(canonicalId);
    if (!existing) return;

    existing.isOnline = payload.isOnline;
    existing.lastSeenAt = payload.lastSeenAt || new Date().toISOString();
    if (typeof payload.isSharingLocation === 'boolean') {
      existing.isSharingLocation = payload.isSharingLocation;
    }

    // Determine status independently from GPS
    if (!payload.isOnline) {
      existing.status = 'offline';
      existing.currentActivity = 'Offline';
    } else if (existing.hasLocation) {
      existing.status = (existing.speed && existing.speed > 3) ? 'moving' : 'idle';
    } else {
      existing.status = 'online';
      existing.currentActivity = existing.isSharingLocation
        ? 'Online • Awaiting GPS fix'
        : 'Online • Standby';
    }

    this.notifyListeners();
  }

  /**
   * Periodic stale presence check (strictly checks presence timeout, NOT location loss)
   */
  private checkStaleLocations() {
    let hasChanges = false;
    const now = Date.now();

    this.employeeLocations.forEach((emp) => {
      if (emp.isOnline) {
        const lastSeenMs = emp.lastSeenAt ? new Date(emp.lastSeenAt).getTime() : 0;
        if (now - lastSeenMs > PRESENCE_TIMEOUT_MS) {
          emp.isOnline = false;
          emp.isSharingLocation = false;
          emp.status = 'offline';
          emp.currentActivity = 'Signal stale (offline)';
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.notifyListeners();
    }
  }

  private persistRealLocation(userId: string, loc: LiveEmployeeLocation) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(REAL_LOCATIONS_STORAGE_KEY);
      const data: Record<string, Partial<LiveEmployeeLocation>> = raw ? JSON.parse(raw) : {};
      data[userId] = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        heading: loc.heading,
        speed: loc.speed,
        batteryLevel: loc.batteryLevel,
        currentActivity: loc.currentActivity,
        updatedAt: loc.updatedAt,
        lastSeenAt: loc.lastSeenAt,
        isOnline: loc.isOnline,
        isSharingLocation: loc.isSharingLocation,
        status: loc.status
      };
      localStorage.setItem(REAL_LOCATIONS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not persist location fix:', e);
    }
  }

  /**
   * Called by Field Worker device to broadcast real GPS coordinates
   */
  async updateEmployeeLocation(
    userId: string,
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      batteryLevel?: number;
      activity?: string;
      employeeCode?: string;
      name?: string;
      role?: string;
    }
  ): Promise<boolean> {
    const payload: LocationUpdatePayload = {
      userId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      heading: coords.heading,
      batteryLevel: coords.batteryLevel,
      activity: coords.activity,
      timestamp: new Date().toISOString()
    };

    return pusherService.broadcastLocation(payload);
  }

  /**
   * Called to send heartbeat to backend
   */
  async sendHeartbeat(data: {
    userId: string;
    employeeCode?: string;
    name?: string;
    role?: string;
    isSharingLocation: boolean;
  }): Promise<boolean> {
    return pusherService.sendHeartbeat(data);
  }

  /**
   * Called when stopping location sharing or logging out
   */
  async sendOffline(userId: string): Promise<boolean> {
    return pusherService.sendOffline(userId);
  }

  getLocations(): LiveEmployeeLocation[] {
    return Array.from(this.employeeLocations.values());
  }

  getEmployeeLocation(userId: string): LiveEmployeeLocation | undefined {
    const canonical = this.resolveCanonicalId(userId);
    return this.employeeLocations.get(canonical);
  }

  subscribe(callback: (locations: LiveEmployeeLocation[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getLocations());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const list = this.getLocations();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (e) {
        console.error('Error in location subscriber:', e);
      }
    });
  }

  destroy() {
    if (this.unsubscribeLocationPusher) {
      this.unsubscribeLocationPusher();
      this.unsubscribeLocationPusher = null;
    }
    if (this.unsubscribePresencePusher) {
      this.unsubscribePresencePusher();
      this.unsubscribePresencePusher = null;
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    this.listeners.clear();
  }
}

export const liveLocationService = new LiveLocationService();
