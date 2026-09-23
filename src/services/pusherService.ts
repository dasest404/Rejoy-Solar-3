import Pusher, { Channel } from 'pusher-js';
import { LocationUpdatePayload, PusherConnectionState } from '../types/tracking';

const DEFAULT_CHANNEL_NAME = 'my-channel';
const DEFAULT_EVENT_NAME = 'location.updated';
const LOCAL_BROADCAST_CHANNEL = 'solarpulse_pusher_location_broadcast';

class PusherService {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private connectionState: PusherConnectionState = 'connecting';
  private connectionListeners: Set<(state: PusherConnectionState) => void> = new Set();
  private locationListeners: Set<(payload: LocationUpdatePayload) => void> = new Set();
  private localBroadcast: BroadcastChannel | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Local broadcast fallback for immediate multi-tab sync
      try {
        if ('BroadcastChannel' in window) {
          this.localBroadcast = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL);
          this.localBroadcast.onmessage = (event) => {
            if (event.data && event.data.type === 'location.updated' && event.data.payload) {
              this.dispatchLocationUpdate(event.data.payload, false);
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

    // Check frontend env vars first
    let appKey = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined;
    let cluster = (import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined) || 'mt1';

    // If not in env, attempt to fetch from backend config endpoint
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
        '[Pusher] VITE_PUSHER_APP_KEY is not configured yet. Live tracking is running in local-broadcast mode.'
      );
      this.updateConnectionState('disconnected');
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
      });

      // Subscribe to single location stream channel
      this.channel = this.pusher.subscribe(DEFAULT_CHANNEL_NAME);

      this.channel.bind(DEFAULT_EVENT_NAME, (data: LocationUpdatePayload) => {
        if (data && data.userId && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          this.dispatchLocationUpdate(data, false);
        }
      });
    } catch (err) {
      console.warn('[Pusher] Error initializing Pusher client:', err);
      this.updateConnectionState('disconnected');
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
      } catch (e) {
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

  /**
   * Broadcast location update: Sends to backend endpoint (which triggers Pusher event 'location.updated')
   * and dispatches locally so UI updates with zero latency.
   */
  async broadcastLocation(payload: LocationUpdatePayload): Promise<boolean> {
    // 1. Dispatch locally immediately for zero-lag feedback
    this.dispatchLocationUpdate(payload, true);

    // 2. Transmit to backend endpoint
    try {
      const res = await fetch('/api/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      console.warn('[Pusher] Location transmission to backend failed:', e);
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
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: (state: PusherConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    // Notify immediately of current state
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
    this.isInitialized = false;
  }
}

// Export singleton instance
export const pusherService = new PusherService();
