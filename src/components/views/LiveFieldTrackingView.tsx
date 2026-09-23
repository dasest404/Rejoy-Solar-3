import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { liveLocationService } from '../../services/liveLocationService';
import { pusherService } from '../../services/pusherService';
import {
  LiveEmployeeLocation,
  TrackingFilterOptions,
  PusherConnectionState
} from '../../types/tracking';
import { LiveFieldMap } from '../tracking/LiveFieldMap';
import { FieldEmployeeList } from '../tracking/FieldEmployeeList';
import { FieldEmployeeDetailsModal } from '../tracking/FieldEmployeeDetailsModal';
import { FieldLocationSharer } from '../tracking/FieldLocationSharer';
import {
  Navigation,
  ArrowLeft,
  RefreshCw,
  Maximize2,
  Minimize2,
  Radio,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';

export const LiveFieldTrackingView: React.FC = () => {
  const { setActiveView } = useApp();
  const { currentUser, isFieldStaff } = useAuth();

  const [locations, setLocations] = useState<LiveEmployeeLocation[]>(() =>
    liveLocationService.getLocations()
  );
  const [selectedEmployee, setSelectedEmployee] = useState<LiveEmployeeLocation | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [followSelected, setFollowSelected] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pusherState, setPusherState] = useState<PusherConnectionState>(() =>
    pusherService.getConnectionState()
  );
  const [lastHeartbeat, setLastHeartbeat] = useState<string>(new Date().toLocaleTimeString());

  const [filters, setFilters] = useState<TrackingFilterOptions>({
    searchQuery: '',
    status: 'ALL',
    role: 'ALL',
    assignment: 'ALL'
  });

  // Listen to Pusher connection state changes
  useEffect(() => {
    const unsubConnection = pusherService.onConnectionChange((state) => {
      setPusherState(state);
    });
    return () => {
      unsubConnection();
    };
  }, []);

  // Subscribe to real-time location stream
  useEffect(() => {
    const unsubscribeLocations = liveLocationService.subscribe((updatedLocations) => {
      setLocations(updatedLocations);
      setLastHeartbeat(new Date().toLocaleTimeString());

      // If an employee was selected, update their reference
      setSelectedEmployee((prev) => {
        if (!prev) return null;
        const match = updatedLocations.find((l) => l.userId === prev.userId);
        return match || prev;
      });
    });

    return () => {
      unsubscribeLocations();
    };
  }, []);

  const handleSelectEmployee = useCallback((emp: LiveEmployeeLocation) => {
    setSelectedEmployee(emp);
  }, []);

  const handleViewDetails = useCallback((emp: LiveEmployeeLocation) => {
    setSelectedEmployee(emp);
    setIsDetailsModalOpen(true);
  }, []);

  const handleCenterOnMap = useCallback((emp: LiveEmployeeLocation) => {
    setSelectedEmployee(emp);
    setFollowSelected(true);
  }, []);

  const handleToggleFollow = useCallback(() => {
    setFollowSelected((prev) => !prev);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Live counters calculated strictly from actual tracking data
  const stats = useMemo(() => {
    const total = locations.length;
    const online = locations.filter((l) => l.hasLocation && (l.status === 'online' || l.status === 'moving')).length;
    const moving = locations.filter((l) => l.hasLocation && l.status === 'moving').length;
    const idle = locations.filter((l) => l.hasLocation && l.status === 'idle').length;
    const offline = locations.filter((l) => !l.hasLocation || l.status === 'offline').length;
    return { total, online, moving, idle, offline };
  }, [locations]);

  // Pusher connection status badge configuration
  const renderConnectionBadge = () => {
    if (pusherState === 'connected') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono">🟢 LIVE</span>
          <span className="text-emerald-700 font-medium hidden sm:inline">• Pusher Connected</span>
        </div>
      );
    }
    if (pusherState === 'connecting') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>🟡 CONNECTING...</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>🔴 CONNECTION LOST</span>
        <span className="text-rose-700 font-normal hidden sm:inline">• Reconnecting...</span>
      </div>
    );
  };

  return (
    <div className={`space-y-4 animate-in fade-in duration-150 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 p-2 space-y-2' : ''}`}>
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (isFullscreen) setIsFullscreen(false);
                else setActiveView('dashboard');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
            <span className="text-slate-300">•</span>
            {renderConnectionBadge()}
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Channel: <strong className="text-slate-600">my-channel</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Navigation className="w-6 h-6 text-amber-500" />
            <span>LIVE FIELD WORKFORCE TRACKING</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time Pusher GPS dispatch & telemetry for Site Survey, Installation, Electrical, Civil & Service Engineers.
          </p>
        </div>

        {/* Live Counters Banner */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-800 font-bold">{stats.online} Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-emerald-700 font-medium">🚗</span>
            <span className="text-emerald-900 font-bold">{stats.moving} Moving</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="text-amber-700 font-medium">🟡</span>
            <span className="text-amber-900 font-bold">{stats.idle} Idle</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">⚫</span>
            <span className="text-slate-700 font-bold">{stats.offline} Offline</span>
          </div>

          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Map'}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 bg-white shadow-2xs"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Field Worker Location Sharer for Authenticated Field Staff */}
      {isFieldStaff && <FieldLocationSharer />}

      {/* Main Interactive Map & Employee Sidebar Workspace */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${
          isFullscreen
            ? 'h-[calc(100vh-130px)] min-h-[480px]'
            : 'h-[calc(100vh-250px)] min-h-[580px]'
        }`}
      >
        {/* Interactive Live Leaflet Map (70-75% width on desktop) */}
        <div className="lg:col-span-8 xl:col-span-8 h-full min-h-[440px] flex flex-col relative">
          <LiveFieldMap
            locations={locations}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
            followSelected={followSelected}
            onToggleFollow={handleToggleFollow}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </div>

        {/* Field Workforce Filterable List (25-30% width on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 h-full min-h-[440px] flex flex-col">
          <FieldEmployeeList
            locations={locations}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
            onViewDetails={handleViewDetails}
            filters={filters}
            onFilterChange={setFilters}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
          />
        </div>
      </div>

      {/* Employee Comprehensive Details Slide-out / Modal */}
      <FieldEmployeeDetailsModal
        employee={selectedEmployee}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onCenterOnMap={handleCenterOnMap}
        followSelected={followSelected}
        onToggleFollow={handleToggleFollow}
      />
    </div>
  );
};
