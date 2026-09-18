import React, { useMemo } from 'react';
import { ProductItem } from '../../types/solar';
import { ReportFilterState, ReportCategoryMeta } from '../../types/reports';
import { exportToCSV } from '../../services/exportImport';
import { ReportFilterBar } from './ReportFilterBar';
import { Package, AlertTriangle, XCircle, CheckCircle2, Boxes } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

interface ProductStockReportProps {
  products: ProductItem[];
  filters: ReportFilterState;
  onFilterChange: (updated: Partial<ReportFilterState>) => void;
  onFilterReset: () => void;
  meta: ReportCategoryMeta;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const ProductStockReport: React.FC<ProductStockReportProps> = ({
  products,
  filters,
  onFilterChange,
  onFilterReset,
  meta,
  showToast
}) => {
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Date filter (if product has createdAt)
      if (p.createdAt) {
        if (filters.fromDate && p.createdAt < filters.fromDate) return false;
        if (filters.toDate && p.createdAt > filters.toDate) return false;
      }

      // Name / SKU / Category filter
      if (filters.name.trim()) {
        const query = filters.name.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = p.sku.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        const matchesHsn = (p.hsnCode || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCategory && !matchesHsn) return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'ALL') {
        const threshold = p.minStockThreshold ?? 10;
        const isOut = p.currentStock <= 0;
        const isLow = p.currentStock > 0 && p.currentStock <= threshold;
        const isIn = p.currentStock > threshold;

        if (filters.status === 'OUT_OF_STOCK' && !isOut) return false;
        if (filters.status === 'LOW_STOCK' && !isLow) return false;
        if (filters.status === 'IN_STOCK' && !isIn) return false;
      }

      return true;
    });
  }, [products, filters]);

  // Aggregate KPIs
  const totalCostValuation = filteredProducts.reduce(
    (sum, p) => sum + Math.max(0, p.currentStock) * (p.unitPrice || 0),
    0
  );
  const totalRetailValuation = filteredProducts.reduce(
    (sum, p) => sum + Math.max(0, p.currentStock) * (p.sellingPrice || 0),
    0
  );
  const lowStockCount = filteredProducts.filter(
    p => p.currentStock > 0 && p.currentStock <= (p.minStockThreshold ?? 10)
  ).length;
  const outOfStockCount = filteredProducts.filter(p => p.currentStock <= 0).length;
  const inStockCount = filteredProducts.filter(p => p.currentStock > (p.minStockThreshold ?? 10)).length;

  // Category breakdown for chart
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; value: number; count: number }> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Other';
      if (!map[cat]) map[cat] = { name: cat, value: 0, count: 0 };
      map[cat].value += Math.max(0, p.currentStock) * (p.unitPrice || 0);
      map[cat].count += 1;
    });
    return Object.values(map);
  }, [filteredProducts]);

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'HSN Code',
      'Unit',
      'Current Stock',
      'Min Alert Level',
      'Cost Price (INR)',
      'Selling Price (INR)',
      'Total Cost Valuation (INR)',
      'Stock Status'
    ];
    const rows = filteredProducts.map(p => {
      const threshold = p.minStockThreshold ?? 10;
      let status = 'In Stock';
      if (p.currentStock <= 0) status = 'Out of Stock';
      else if (p.currentStock <= threshold) status = 'Low Stock';

      return [
        p.sku,
        p.name,
        p.category,
        p.hsnCode || 'N/A',
        p.unit,
        p.currentStock,
        threshold,
        p.unitPrice,
        p.sellingPrice,
        Math.max(0, p.currentStock) * (p.unitPrice || 0),
        status
      ];
    });
    exportToCSV(`SolarPulse_Product_Stock_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    showToast('Product stock report exported to CSV', 'success');
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
        totalCount={products.length}
        filteredCount={filteredProducts.length}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Inventory Valuation</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalCostValuation.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Retail potential: ₹{totalRetailValuation.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Healthy Stock</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {inStockCount} SKUs
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Stock comfortably above threshold</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Low Stock Alerts</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {lowStockCount} SKUs
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Below re-order threshold</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Out of Stock</span>
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {outOfStockCount} SKUs
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires immediate procurement</p>
        </div>
      </div>

      {/* Valuation by Category Chart */}
      {categoryChartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Stock Asset Valuation by Category</h3>
          <p className="text-xs text-slate-500 mb-4">Capital distribution in panels, inverters, and BOS</p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Stock Value']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Products Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Equipment Stock Valuation Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time inventory levels, unit costs, and valuations</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {filteredProducts.length} Products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">HSN</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4 text-right">Min Alert</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No products found matching filters</p>
                    <p className="text-[11px] text-slate-400 mt-1">Adjust your filters to inspect more stock items</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const valuation = Math.max(0, p.currentStock) * (p.unitPrice || 0);
                  const isOut = p.currentStock <= 0;
                  const threshold = p.minStockThreshold ?? 10;
                  const isLow = p.currentStock > 0 && p.currentStock <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {p.name}
                        {(p.specification || p.brand) && (
                          <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[200px]">
                            {p.specification || p.brand}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{p.hsnCode || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {p.currentStock}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">
                        {threshold} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{p.unitPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{p.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{valuation.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
