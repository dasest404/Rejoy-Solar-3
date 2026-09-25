import Pusher, { Channel } from 'pusher-js';
import { LocationUpdatePayload, PresenceUpdatePayload, PusherConnectionState } from '../types/tracking';

const DEFAULT_CHANNEL_NAME = 'my-channel';
const DEFAULT_LOCATION_EVENT = 'location.updated';
const DEFAULT_PRESENCE_EVENT = 'presence.updated';
const LOCAL_BROADCAST_CHANNEL = 'solarpulse_pusher_location_broadcast';

class PusherService {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private connectionState: PusherConnectionState = 'connecting';
  private connectionListeners: Set<(state: PusherConnectionState) => void> = new Set();
  private locationListeners: Set<(payload: LocationUpdatePayload) => void> = new Set();
  private presenceListeners: Set<(payload: PresenceUpdatePayload) => void> = new Set();
  private localBroadcast: BroadcastChannel | null = null;
  private sseSource: EventSource | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Local broadcast fallback for immediate multi-tab sync on same machine
      try {
        if ('BroadcastChannel' in window) {
          this.localBroadcast = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL);
          this.localBroadcast.onmessage = (event) => {
            if (event.data?.type === 'location.updated' && event.data.payload) {
              this.dispatchLocationUpdate(event.data.payload, false);
            } else if (event.data?.type === 'presence.updated' && event.data.payload) {
              this.dispatchPresenceUpdate(event.data.payload, false);
            }
          };
        }
      } catch (e) {
        console.warn('Local broadcast fallback not initialized:', e);
      }

      this.init();
    }
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Check frontend env vars (support both VITE_PUSHER_KEY and VITE_PUSHER_APP_KEY)
    let appKey =
      (import.meta.env.VITE_PUSHER_KEY as string | undefined) ||
      (import.meta.env.VITE_PUSHER_APP_KEY as string | undefined);
    let cluster =
      (import.meta.env.VITE_PUSHER_CLUSTER as string | undefined) ||
      (import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined) ||
      'mt1';

    // If not in env, fetch from backend config endpoint
    if (!appKey) {
      try {
        const res = await fetch('/api/pusher/config');
        if (res.ok) {
          const config = await res.json();
          if (config.key) {
            appKey = config.key;
            cluster = config.cluster || cluster;
          }
        }
      } catch {
        // Backend config fetch optional
      }
    }

    if (!appKey) {
      console.info(
        '[Pusher] Public Pusher key not set. Connecting to server real-time stream as backup.'
      );
      this.initSseFallback();
      return;
    }

    try {
      this.updateConnectionState('connecting');

      this.pusher = new Pusher(appKey, {
        cluster,
        forceTLS: true
      });

      // Bind connection state handlers
      this.pusher.connection.bind('connected', () => {
        this.updateConnectionState('connected');
      });

      this.pusher.connection.bind('connecting', () => {
        this.updateConnectionState('connecting');
      });

      this.pusher.connection.bind('disconnected', () => {
        this.updateConnectionState('disconnected');
      });

      this.pusher.connection.bind('unavailable', () => {
        this.updateConnectionState('disconnected');
      });

      this.pusher.connection.bind('failed', () => {
        this.updateConnectionState('disconnected');
        this.initSseFallback();
      });

      // Subscribe to single location & presence stream channel
      this.channel = this.pusher.subscribe(DEFAULT_CHANNEL_NAME);

      this.channel.bind(DEFAULT_LOCATION_EVENT, (data: LocationUpdatePayload) => {
        if (data && data.userId && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          this.dispatchLocationUpdate(data, false);
        }
      });

      this.channel.bind(DEFAULT_PRESENCE_EVENT, (data: PresenceUpdatePayload) => {
        if (data && data.userId) {
          this.dispatchPresenceUpdate(data, false);
        }
      });
    } catch (err) {
      console.warn('[Pusher] Error initializing Pusher client:', err);
      this.updateConnectionState('disconnected');
      this.initSseFallback();
    }
  }

  // Backup Server-Sent Events stream when Pusher is absent or unavailable
  private initSseFallback() {
    if (this.sseSource || typeof window === 'undefined') return;

    try {
      this.sseSource = new EventSource('/api/workforce/stream');

      this.sseSource.onopen = () => {
        // In local/dev fallback mode, mark connected
        if (!this.pusher || this.connectionState !== 'connected') {
          this.updateConnectionState('connected');
        }
      };

      this.sseSource.addEventListener('location.updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as LocationUpdatePayload;
          if (payload && payload.userId && typeof payload.latitude === 'number') {
            this.dispatchLocationUpdate(payload, false);
          }
        } catch {
          // Parse error ignored
        }
      });

      this.sseSource.addEventListener('presence.updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as PresenceUpdatePayload;
          if (payload && payload.userId) {
            this.dispatchPresenceUpdate(payload, false);
          }
        } catch {
          // Parse error ignored
        }
      });

      this.sseSource.onerror = () => {
        if (!this.pusher) {
          this.updateConnectionState('disconnected');
        }
      };
    } catch (e) {
      console.warn('SSE fallback error:', e);
    }
  }

  private updateConnectionState(newState: PusherConnectionState) {
    this.connectionState = newState;
    this.connectionListeners.forEach((listener) => {
      try {
        listener(newState);
      } catch (e) {
        console.error('[Pusher] Error in connection listener:', e);
      }
    });
  }

  private dispatchLocationUpdate(payload: LocationUpdatePayload, broadcastLocal: boolean) {
    if (broadcastLocal && this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({ type: 'location.updated', payload });
      } catch {
        // Broadcast error ignored
      }
    }

    this.locationListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('[Pusher] Error in location listener:', e);
      }
    });
  }

  private dispatchPresenceUpdate(payload: PresenceUpdatePayload, broadcastLocal: boolean) {
    if (broadcastLocal && this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({ type: 'presence.updated', payload });
      } catch {
        // Broadcast error ignored
      }
    }

    this.presenceListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('[Pusher] Error in presence listener:', e);
      }
    });
  }

  /**
   * Broadcast location update: Sends to backend endpoint (which triggers Pusher event 'location.updated')
   * and dispatches locally so UI updates immediately.
   */
  async broadcastLocation(payload: LocationUpdatePayload): Promise<boolean> {
    // 1. Dispatch locally immediately for zero-lag feedback
    this.dispatchLocationUpdate(payload, true);

    // 2. Transmit to backend endpoint
    try {
      const res = await fetch('/api/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': payload.userId
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      console.warn('[Pusher] Location transmission to backend failed:', e);
      return false;
    }
  }

  /**
   * Transmit Presence Heartbeat to backend
   */
  async sendHeartbeat(data: {
    userId: string;
    employeeCode?: string;
    name?: string;
    role?: string;
    isSharingLocation: boolean;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': data.userId
        },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.warn('[Presence] Heartbeat failed:', e);
      return false;
    }
  }

  /**
   * Transmit Offline Presence status to backend
   */
  async sendOffline(userId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/presence/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });
      return res.ok;
    } catch (e) {
      console.warn('[Presence] Offline update failed:', e);
      return false;
    }
  }

  /**
   * Subscribe to incoming location.updated events
   */
  onLocationUpdate(callback: (payload: LocationUpdatePayload) => void): () => void {
    this.locationListeners.add(callback);
    return () => {
      this.locationListeners.delete(callback);
    };
  }

  /**
   * Subscribe to incoming presence.updated events
   */
  onPresenceUpdate(callback: (payload: PresenceUpdatePayload) => void): () => void {
    this.presenceListeners.add(callback);
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: (state: PusherConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    callback(this.connectionState);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  getConnectionState(): PusherConnectionState {
    return this.connectionState;
  }

  cleanup(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(DEFAULT_CHANNEL_NAME);
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const pusherService = new PusherService();
