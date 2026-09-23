import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { liveLocationService } from '../../services/liveLocationService';
import {
  MapPin,
  Navigation,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play
} from 'lucide-react';

export const FieldLocationSharer: React.FC = () => {
  const { currentUser, isFieldStaff } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number; accuracy: number; speed: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Check browser geolocation support
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
    }
  }, []);

  // Stop watching when unmounting
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!currentUser || !isFieldStaff) {
    return null;
  }

  const startSharing = () => {
    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      return;
    }

    setErrorMessage(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPermissionState('granted');
        setIsSharing(true);

        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        setLastCoords({
          lat: parseFloat(latitude.toFixed(5)),
          lng: parseFloat(longitude.toFixed(5)),
          accuracy: Math.round(accuracy),
          speed: speed ? Math.round(speed * 3.6) : 0
        });

        // Broadcast to liveLocationService
        liveLocationService.updateEmployeeLocation(currentUser.id, {
          latitude,
          longitude,
          accuracy,
          speed: speed || undefined,
          heading: heading || undefined
        });
      },
      (error) => {
        setIsSharing(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setErrorMessage('Location access was denied. Please allow location permissions in your browser.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('GPS position is currently unavailable. Waiting for device fix...');
        } else {
          setErrorMessage('GPS timeout occurred while acquiring location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 4000
      }
    );
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isSharing ? 'bg-emerald-500 text-white animate-pulse' : 'bg-amber-500 text-white'}`}>
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900">
              Field Worker Live GPS Dispatch
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSharing ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {isSharing ? '● Live Sharing Active' : 'Standby'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isSharing && lastCoords
              ? `Transmitting real-time GPS coordinates (${lastCoords.lat}°, ${lastCoords.lng}°) ±${lastCoords.accuracy}m`
              : 'Broadcast your current location so supervisors can track dispatch status & site arrival.'}
          </p>
          {errorMessage && (
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isSharing ? (
          <button
            onClick={stopSharing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
          >
            <Pause className="w-3.5 h-3.5 text-amber-600" />
            <span>Pause Sharing</span>
          </button>
        ) : (
          <button
            onClick={startSharing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Share My Location</span>
          </button>
        )}
      </div>
    </div>
  );
};
