import React, { useMemo } from 'react';
import { PaymentRecord, Customer } from '../../types/solar';
import { ReportFilterState, ReportCategoryMeta } from '../../types/reports';
import { exportToCSV } from '../../services/exportImport';
import { ReportFilterBar } from './ReportFilterBar';
import { IndianRupee, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface IncomeSummaryReportProps {
  payments: PaymentRecord[];
  customers: Customer[];
  filters: ReportFilterState;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onFilterReset: () => void;
  meta: ReportCategoryMeta;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const IncomeSummaryReport: React.FC<IncomeSummaryReportProps> = ({
  payments,
  customers,
  filters,
  onFilterChange,
  onFilterReset,
  meta,
  showToast
}) => {
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.paidDate || p.dueDate;

      // Date filter
      if (filters.fromDate && pDate < filters.fromDate) return false;
      if (filters.toDate && pDate > filters.toDate) return false;

      // Name filter
      if (filters.name.trim()) {
        const query = filters.name.toLowerCase();
        const custName = (p.customerName || customerMap.get(p.customerId) || '').toLowerCase();
        const matchesMilestone = (p.milestone || '').toLowerCase().includes(query);
        const matchesRcpt = (p.receiptNumber || '').toLowerCase().includes(query);
        const matchesCust = custName.includes(query);
        if (!matchesMilestone && !matchesRcpt && !matchesCust) return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'ALL') {
        if (p.status !== filters.status) return false;
      }

      return true;
    });
  }, [payments, filters, customerMap]);

  // Aggregate KPIs
  const totalInflowsRealized = filteredPayments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingReceivables = filteredPayments
    .filter(p => p.status === 'PENDING' || p.status === 'PARTIAL')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const overdueReceivables = filteredPayments
    .filter(p => p.status === 'OVERDUE')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPipelineInflow = totalInflowsRealized + pendingReceivables + overdueReceivables;

  // Monthly inflow collection data
  const monthlyInflows = useMemo(() => {
    const map: Record<string, { month: string; amount: number; count: number }> = {};
    filteredPayments.forEach(p => {
      const d = p.paidDate || p.dueDate || '2025-01-01';
      const m = d.slice(0, 7);
      if (!map[m]) map[m] = { month: m, amount: 0, count: 0 };
      if (p.status === 'PAID') {
        map[m].amount += p.amount;
        map[m].count += 1;
      }
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  const handleExportCSV = () => {
    const headers = [
      'Receipt #',
      'Milestone Stage',
      'Customer Name',
      'Amount (INR)',
      'Due Date',
      'Paid Date',
      'Payment Mode',
      'Status',
      'Tally Synced'
    ];
    const rows = filteredPayments.map(p => [
      p.receiptNumber || 'N/A',
      p.milestone,
      p.customerName || customerMap.get(p.customerId) || p.customerId,
      p.amount,
      p.dueDate,
      p.paidDate || 'N/A',
      p.paymentMode || 'N/A',
      p.status,
      p.tallySyncStatus === 'SYNCED' ? 'Yes' : 'No'
    ]);
    exportToCSV(`SolarPulse_Income_Summary_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    showToast('Income summary exported to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onChange={onFilterChange}
        onReset={onFilterReset}
        onExportCSV={handleExportCSV}
        onPrint={() => window.print()}
        categoryMeta={meta}
        totalCount={payments.length}
        filteredCount={filteredPayments.length}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Realized Inflows</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            ₹{totalInflowsRealized.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Cleared cash collections</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pending Milestones</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            ₹{pendingReceivables.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Expected project milestone payments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Overdue Collections</span>
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            ₹{overdueReceivables.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Due date elapsed without payment</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Scheduled Inflow</span>
            <span className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalPipelineInflow.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all scheduled milestones</p>
        </div>
      </div>

      {/* Monthly Chart */}
      {monthlyInflows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Inflow Realization (Cash Receipts)</h3>
          <p className="text-xs text-slate-500 mb-4">Real-time collections deposited into company bank accounts</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyInflows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={val => `₹${(val / 100000).toFixed(1)}L`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount Realized']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Payment Milestones & Inflows Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Record of project milestone receipts and settlement tracking</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {filteredPayments.length} Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                <th className="py-3 px-4">Receipt / Ref</th>
                <th className="py-3 px-4">Milestone</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Paid Date</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tally Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <IndianRupee className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No income receipts match the selected filters</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.receiptNumber || `M-${p.id.slice(0, 6)}`}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{p.milestone}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.customerName || customerMap.get(p.customerId) || p.customerId}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{p.dueDate}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-emerald-700 font-medium">
                      {p.paidDate || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.paymentMode || 'Pending'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                          p.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                          p.tallySyncStatus === 'SYNCED' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.tallySyncStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
