import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { liveLocationService } from '../../services/liveLocationService';
import { LiveEmployeeLocation } from '../../types/tracking';
import {
  SunMedium,
  Zap,
  TrendingUp,
  CreditCard,
  Layers,
  Wrench,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
  Navigation
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { openCustomerControlCenter, setActiveView, setStageFilterKey, openImportExportModal, refreshTrigger } = useApp();
  const { currentUser, isCustomer } = useAuth();

  const projects = useMemo(() => storageService.getProjects(), [refreshTrigger]);
  const leads = useMemo(() => storageService.getLeads(), [refreshTrigger]);
  const payments = useMemo(() => storageService.getPayments(), [refreshTrigger]);
  const serviceTickets = useMemo(() => storageService.getServiceTickets(), [refreshTrigger]);
  const activities = useMemo(() => storageService.getRecentActivities(8), [refreshTrigger]);

  // Compute metrics
  const totalCapacityKw = projects.reduce((sum, p) => sum + p.capacityKw, 0);
  const totalProjectValue = projects.reduce((sum, p) => sum + p.totalValue, 0);
  const totalCollected = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPendingCollection = payments
    .filter(p => p.status !== 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeLeadsCount = leads.filter(l => !['WON', 'LOST'].includes(l.status)).length;
  const openTicketsCount = serviceTickets.filter(s => s.status !== 'RESOLVED').length;

  // Live Field Workforce tracking statistics (live subscription)
  const [liveLocations, setLiveLocations] = useState<LiveEmployeeLocation[]>(() =>
    liveLocationService.getLocations()
  );

  useEffect(() => {
    const unsub = liveLocationService.subscribe((locs) => {
      setLiveLocations(locs);
    });
    return () => unsub();
  }, []);

  const liveStats = useMemo(() => {
    const online = liveLocations.filter(
      (l) => l.hasLocation && (l.status === 'online' || l.status === 'moving')
    ).length;
    const moving = liveLocations.filter((l) => l.hasLocation && l.status === 'moving').length;
    const idle = liveLocations.filter((l) => l.hasLocation && l.status === 'idle').length;
    return { online, moving, idle, total: liveLocations.length };
  }, [liveLocations]);

  // Pipeline stage breakdown
  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'Survey': 0,
      'Design': 0,
      'Procurement': 0,
      'Civil/Struct': 0,
      'Installation': 0,
      'Electrical': 0,
      'Net Metering': 0,
      'Commissioned': 0
    };

    projects.forEach(p => {
      const stage = p.currentStageKey;
      if (stage === 'site_survey') counts['Survey']++;
      else if (['quotation_proposal', 'customer_confirmation', 'advance_payment', 'procurement_dispatch'].includes(stage as any)) counts['Procurement']++;
      else if (['civil_work', 'structure_mounting', 'structure_fabrication'].includes(stage as any)) counts['Civil/Struct']++;
      else if ((stage as string) === 'panel_installation' || (stage as string) === 'solar_installation' || (stage as string) === 'module_mounting') counts['Installation']++;
      else if ((stage as string) === 'inverter_electrical' || (stage as string) === 'inverter_installation' || (stage as string) === 'electrical_wiring') counts['Electrical']++;
      else if (['testing_commissioning', 'net_metering', 'final_handover', 'discom_metering'].includes(stage as any)) counts['Net Metering']++;
      else counts['Commissioned']++;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Financial chart data (Monthly simulated billing & collections)
  const financialData = [
    { month: 'Apr', billed: 42, collected: 38 },
    { month: 'May', billed: 65, collected: 52 },
    { month: 'Jun', billed: 88, collected: 79 },
    { month: 'Jul', billed: 110, collected: 95 },
    { month: 'Aug', billed: 145, collected: 120 },
    { month: 'Sep', billed: 165, collected: 138 }
  ];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#14b8a6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner / Welcome */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Operational Workspace
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Logged in as {currentUser.name} ({currentUser.role})</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Executive Solar EPC Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time pipeline monitoring from Lead Ingestion to Grid Synchronization & AMC.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('crm_leads')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Inquiry</span>
          </button>

          <button
            onClick={() => setActiveView('customer_control_center')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Control Center</span>
          </button>

          <button
            onClick={() => openImportExportModal('Projects')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Capacity */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Capacity</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <SunMedium className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {(totalCapacityKw / 1000).toFixed(2)} <span className="text-sm font-bold text-slate-500">MW</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-700 font-bold">{(totalCapacityKw).toLocaleString()} kW</span> across {projects.length} sites
            </p>
          </div>
        </div>

        {/* Project Order Book */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Book</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{(totalProjectValue / 10000000).toFixed(2)} <span className="text-sm font-bold text-slate-500">Cr</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              ₹{totalProjectValue.toLocaleString('en-IN')} Total Contracted
            </p>
          </div>
        </div>

        {/* Collections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collections</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{(totalCollected / 100000).toFixed(1)} <span className="text-sm font-bold text-slate-500">Lakh</span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              ₹{(totalPendingCollection / 100000).toFixed(1)}L milestone pending
            </p>
          </div>
        </div>

        {/* Leads & Tickets */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pipeline & AMC</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{activeLeadsCount}</span>
              <span className="text-xs text-slate-400">Leads</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{openTicketsCount}</span>
              <span className="text-xs text-slate-400">Tickets</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              High commercial conversion rate
            </p>
          </div>
        </div>

        {/* Live Field Workforce Card */}
        <div
          onClick={() => setActiveView('live_tracking')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden group cursor-pointer hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Field Workforce
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                <Navigation className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{liveStats.online} Online</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="text-[11px]">🚗</span>
                <span>{liveStats.moving} Moving</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-amber-700">
                <span className="text-[11px]">🟡</span>
                <span>{liveStats.idle} Idle</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
            <span>View Live Tracking</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>

      {/* Solar Stage Workflow Velocity Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Turnkey EPC Execution Pipeline (Live Project Velocity)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any stage to filter active site projects</p>
          </div>
          <button
            onClick={() => setActiveView('projects_all')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <span>View All Projects</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stageDistribution.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                setStageFilterKey(item.name.toLowerCase());
                setActiveView('projects_stage_filtered');
              }}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer transition-all text-center group"
            >
              <span className="text-[11px] font-semibold text-slate-500 truncate block group-hover:text-amber-800">
                {item.name}
              </span>
              <div className="text-lg font-black text-slate-800 mt-1 group-hover:text-amber-700">
                {item.value}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, item.value * 25)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section: Monthly Financials & Capacity Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Financial Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Execution & Cash Inflow</h2>
              <p className="text-xs text-slate-500">Contract Invoicing vs Payment Receipts (₹ Lakhs)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Billed
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Collected
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value} Lakhs`, '']}
                />
                <Bar dataKey="billed" name="Billed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Category Capacity Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Project Type Portfolio</h2>
            <p className="text-xs text-slate-500">Breakdown by Industrial, Commercial & Institutional</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Industrial C&I', value: 1650 },
                    { name: 'Commercial Rooftop', value: 500 },
                    { name: 'Institutional', value: 150 }
                  ]}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip formatter={(value) => [`${value} kW`, 'Capacity']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="font-bold text-amber-600 block">71%</span>
              <span className="text-[11px] text-slate-500">Industrial</span>
            </div>
            <div>
              <span className="font-bold text-blue-600 block">22%</span>
              <span className="text-[11px] text-slate-500">Commercial</span>
            </div>
            <div>
              <span className="font-bold text-emerald-600 block">7%</span>
              <span className="text-[11px] text-slate-500">Institutional</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Live Project Control Center Shortcuts & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Quick Access */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active High-Priority Projects</h2>
              <p className="text-xs text-slate-500">Click any project to jump directly into the Customer Control Center</p>
            </div>
            <button
              onClick={() => setActiveView('projects_all')}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              All ({projects.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {projects.slice(0, 4).map(p => (
              <div
                key={p.id}
                onClick={() => openCustomerControlCenter(p.customerId, p.id)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {p.capacityKw}kW
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                        {p.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                        {p.projectCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.customerName} • Site: {p.location} • ₹{(p.totalValue / 100000).toFixed(1)}L
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block capitalize">
                      {p.currentStageKey.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Overall Progress: {p.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${p.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Live Operational Log</span>
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
              Automated
            </span>
          </div>

          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {activities.map((act, idx) => (
              <div key={`${act.id}-${idx}`} className="relative pl-5 border-l-2 border-slate-200 pb-1 last:border-transparent">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white" />
                <div className="text-xs font-bold text-slate-800">{act.action}</div>
                <p className="text-xs text-slate-600 mt-0.5">{act.details}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>By {act.userName}</span>
                  <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
