import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { ProductItem, StockMovement } from '../../types/solar';
import {
  Boxes,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  SlidersHorizontal,
  X,
  History,
  CheckCircle,
  Package,
  Layers,
  FileText,
  DollarSign
} from 'lucide-react';

export const InventoryStockManager: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast } = useApp();
  const { currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'LEVELS' | 'MOVEMENTS'>('LEVELS');
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');

  // Modal for Stock Adjustment
  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null);
  const [newCount, setNewCount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Quarterly Physical Count Audit');

  const products = useMemo(() => storageService.getProducts(), [refreshTrigger]);
  const movements = useMemo(() => storageService.getStockMovements(), [refreshTrigger]);

  // Inventory valuation & health metrics
  const inventoryMetrics = useMemo(() => {
    const totalValuation = products.reduce((acc, p) => acc + p.currentStock * p.unitPrice, 0);
    const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
    const lowStockCount = products.filter(p => p.currentStock <= p.minStockThreshold).length;
    const outOfStockCount = products.filter(p => p.currentStock === 0).length;

    return { totalValuation, totalUnits, lowStockCount, outOfStockCount };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return products;

    return products.filter(p => {
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery]);

  const filteredMovements = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();

    return movements.filter(m => {
      const matchesSearch =
        !q ||
        (m.productName || '').toLowerCase().includes(q) ||
        (m.sku || '').toLowerCase().includes(q) ||
        (m.referenceNumber && (m.referenceNumber || '').toLowerCase().includes(q));
      const matchesType = movementFilter === 'ALL' || m.movementType === movementFilter;
      return matchesSearch && matchesType;
    });
  }, [movements, searchQuery, movementFilter]);

  const handleOpenAdjust = (p: ProductItem) => {
    setAdjustingProduct(p);
    setNewCount(p.currentStock);
    setAdjustReason('Physical Inventory Audit');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    storageService.adjustStock(
      adjustingProduct.id,
      newCount,
      adjustReason,
      currentUser?.name || 'Operations Supervisor'
    );
    triggerRefresh();
    showToast(`Inventory count updated for ${adjustingProduct.sku}`, 'success');
    setAdjustingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Valuation Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Stock Valuation
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            ₹{inventoryMetrics.totalValuation.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            At purchase cost across {products.length} SKUs
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Units On-Hand
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-blue-700 mt-2 font-mono">
            {inventoryMetrics.totalUnits.toLocaleString('en-IN')} Units
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
            Modules, inverters, cables & hardware
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Low Stock Reorders
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-700 mt-2 font-mono">
            {inventoryMetrics.lowStockCount} Items
          </div>
          <span className="text-[11px] text-rose-600 font-semibold mt-1 block">
            Below safe minimum threshold
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Stock Audit Logs
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2 font-mono">
            {movements.length} Transactions
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Automated synchronization history
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('LEVELS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeSubTab === 'LEVELS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Live Stock Levels & Adjustments
          </button>
          <button
            onClick={() => setActiveSubTab('MOVEMENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeSubTab === 'MOVEMENTS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Stock Movements & Audit Ledger ({movements.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items or logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
          />
        </div>
      </div>

      {/* Tab 1: Live Stock Levels Table */}
      {activeSubTab === 'LEVELS' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU & Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5 text-center">Current Stock</th>
                  <th className="p-3.5 text-center">Safety Min</th>
                  <th className="p-3.5 text-right">Valuation (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isLow = p.currentStock <= p.minStockThreshold;
                  const itemValuation = p.currentStock * p.unitPrice;
                  const ratio = Math.min(100, Math.round((p.currentStock / (p.minStockThreshold * 2.5)) * 100));

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{p.sku}</span>
                          <span>•</span>
                          <span>{p.brand}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{p.category}</td>
                      <td className="p-3.5 text-slate-600">{p.location}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                        {/* Mini visual gauge */}
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isLow ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, ratio)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-500">
                        {p.minStockThreshold} {p.unit}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        ₹{itemValuation.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenAdjust(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Adjust Count
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movements Audit Ledger */}
      {activeSubTab === 'MOVEMENTS' && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['ALL', 'PURCHASE_RECEIPT', 'BOM_ALLOCATION', 'INVOICE_SALE', 'ADJUSTMENT'].map(
              type => (
                <button
                  key={type}
                  onClick={() => setMovementFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    movementFilter === type
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Transaction Type</th>
                    <th className="p-3.5">Item & SKU</th>
                    <th className="p-3.5 text-center">Change Qty</th>
                    <th className="p-3.5 text-center">Balance After</th>
                    <th className="p-3.5">Reference Document</th>
                    <th className="p-3.5">Notes & Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map(m => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleDateString()}{' '}
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                              m.movementType === 'PURCHASE_RECEIPT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : m.movementType === 'BOM_ALLOCATION'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : m.movementType === 'INVOICE_SALE'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            )}
                            {m.movementType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{m.productName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{m.sku}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold text-slate-800">
                          {m.balanceAfter}
                        </td>
                        <td className="p-3.5 font-mono text-amber-700 font-bold whitespace-nowrap">
                          {m.referenceNumber || 'MANUAL-ADJ'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{m.notes}</div>
                          {m.performedBy && (
                            <span className="text-[10px] text-slate-400">by {m.performedBy}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        No stock movement records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Stock Adjustment */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">
                  {adjustingProduct.sku}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Manual Stock Count Adjustment</h3>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Product:</span>
                <span className="font-semibold text-slate-800 text-sm block">
                  {adjustingProduct.name}
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  Recorded System Quantity: <strong>{adjustingProduct.currentStock} {adjustingProduct.unit}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Physical On-Hand Count ({adjustingProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newCount}
                  onChange={e => setNewCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                >
                  <option value="Quarterly Physical Count Audit">Quarterly Physical Count Audit</option>
                  <option value="Damaged / Scrapped during transport">
                    Damaged / Scrapped during transport
                  </option>
                  <option value="Returned from Project Site">Returned from Project Site</option>
                  <option value="Supplier Replacement Delivery">Supplier Replacement Delivery</option>
                  <option value="Inventory Reconciliation Correction">
                    Inventory Reconciliation Correction
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
