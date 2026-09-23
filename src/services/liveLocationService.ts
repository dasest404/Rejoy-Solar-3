import { Employee, SolarProject } from '../types/solar';
import { storageService } from './storage';
import { pusherService } from './pusherService';
import {
  LiveEmployeeLocation,
  WorkforceLiveStatus,
  ELIGIBLE_FIELD_ROLES,
  LocationCoordinates,
  LocationUpdatePayload
} from '../types/tracking';

const REAL_LOCATIONS_STORAGE_KEY = 'solarpulse_real_employee_locations_v1';
const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes without GPS update marks worker offline

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
  private listeners: Set<(locations: LiveEmployeeLocation[]) => void> = new Set();
  private unsubscribePusher: (() => void) | null = null;
  private staleCheckTimer: any = null;

  constructor() {
    this.initializeFieldWorkers();

    // Listen to real-time location stream from Pusher
    this.unsubscribePusher = pusherService.onLocationUpdate((payload) => {
      this.handleIncomingPusherLocation(payload);
    });

    // Periodic stale checker (updates status if GPS signal goes cold)
    if (typeof window !== 'undefined') {
      this.staleCheckTimer = setInterval(() => {
        this.checkStaleLocations();
      }, 15000);
    }
  }

  // Check whether an employee role is eligible for field tracking
  isEligibleFieldWorker(role: string, department?: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase().trim();
    const normalizedDept = (department || '').toLowerCase().trim();

    // Disqualify office and non-field staff
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

  private initializeFieldWorkers() {
    const allEmployees = storageService.getEmployees();
    const allProjects = storageService.getProjects();

    // Load any real persisted GPS fixes from previous sessions
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

      const now = Date.now();
      const lastUpdatedMs = cached?.updatedAt ? new Date(cached.updatedAt).getTime() : 0;
      const isRecent = now - lastUpdatedMs < STALE_TIMEOUT_MS;

      const record: LiveEmployeeLocation = {
        userId: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        role: emp.systemRole || emp.designation,
        avatar: emp.photoUrl,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        
        // Coordinates: only set if real device GPS was reported
        latitude: hasRealCoordinates ? cached.latitude : undefined,
        longitude: hasRealCoordinates ? cached.longitude : undefined,
        hasLocation: Boolean(hasRealCoordinates),
        
        accuracy: hasRealCoordinates ? cached.accuracy : undefined,
        heading: hasRealCoordinates ? cached.heading : undefined,
        speed: hasRealCoordinates ? cached.speed : undefined,
        updatedAt: cached?.updatedAt || new Date().toISOString(),
        
        status: !hasRealCoordinates
          ? 'offline'
          : isRecent
          ? ((cached.speed || 0) > 3 ? 'moving' : 'idle')
          : 'offline',

        batteryLevel: cached?.batteryLevel,
        currentActivity: !hasRealCoordinates ? 'Location unavailable' : cached.currentActivity || 'Field Operations',
        lastLocationAddress: cached?.lastLocationAddress
      };

      if (assignedProject) {
        record.assignedProjectId = assignedProject.id;
        record.assignedProjectCode = assignedProject.projectCode;
        record.assignedProjectTitle = `${assignedProject.capacityKw} kW ${assignedProject.systemType || 'Solar EPC'} - ${assignedProject.customerName}`;
        record.assignedCustomerName = assignedProject.customerName;
        record.assignedSiteAddress = assignedProject.siteAddress || assignedProject.city;

        // If site coordinates are present and worker has coordinates, calculate distance
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

  private handleIncomingPusherLocation(payload: LocationUpdatePayload) {
    const existing = this.employeeLocations.get(payload.userId);
    const speed = payload.speed !== undefined ? payload.speed : 0;
    const status: WorkforceLiveStatus = speed > 3 ? 'moving' : 'idle';

    const timestamp = payload.timestamp || new Date().toISOString();

    let updated: LiveEmployeeLocation;

    if (existing) {
      updated = {
        ...existing,
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasLocation: true,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
        batteryLevel: payload.batteryLevel ?? existing.batteryLevel,
        currentActivity: payload.activity || (speed > 3 ? 'In Transit / Moving' : 'On Site / Active'),
        updatedAt: timestamp,
        status
      };

      // Recalculate distance to assigned site if present
      if (updated.assignedSiteCoordinates) {
        updated.distanceToSiteKm = calculateDistanceKm(
          payload.latitude,
          payload.longitude,
          updated.assignedSiteCoordinates.latitude,
          updated.assignedSiteCoordinates.longitude
        );
      }
    } else {
      // Worker not in preloaded list, create new entry
      updated = {
        userId: payload.userId,
        name: `Field Worker (${payload.userId.slice(0, 6)})`,
        role: 'Technician',
        phone: '+91 98250 00000',
        department: 'Operations',
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasLocation: true,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
        batteryLevel: payload.batteryLevel,
        currentActivity: payload.activity || (speed > 3 ? 'In Transit' : 'Active'),
        updatedAt: timestamp,
        status
      };
    }

    this.employeeLocations.set(payload.userId, updated);
    this.persistRealLocation(payload.userId, updated);
    this.notifyListeners();
  }

  private checkStaleLocations() {
    let hasChanges = false;
    const now = Date.now();

    this.employeeLocations.forEach((emp, id) => {
      if (emp.hasLocation && emp.status !== 'offline') {
        const lastUpdatedMs = new Date(emp.updatedAt).getTime();
        if (now - lastUpdatedMs > STALE_TIMEOUT_MS) {
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
        status: loc.status
      };
      localStorage.setItem(REAL_LOCATIONS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not persist location fix:', e);
    }
  }

  /**
   * Called by the Field Worker device to broadcast real GPS coordinates
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

  getLocations(): LiveEmployeeLocation[] {
    return Array.from(this.employeeLocations.values());
  }

  getEmployeeLocation(userId: string): LiveEmployeeLocation | undefined {
    return this.employeeLocations.get(userId);
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
    if (this.unsubscribePusher) {
      this.unsubscribePusher();
      this.unsubscribePusher = null;
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    this.listeners.clear();
  }
}

export const liveLocationService = new LiveLocationService();
