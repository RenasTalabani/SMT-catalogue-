'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, RefreshCw, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import { clsx } from 'clsx';

interface LowStockProduct {
  id:            number;
  name:          string;
  sku:           string | null;
  category:      string;
  quantity:      number;
  lowStockAlert: number;
  price:         number;
  imageUrl:      string | null;
}

interface InventoryValue {
  lowStock: LowStockProduct[];
  totalValue: number;
  items: LowStockProduct[];
}

export default function StockAlertsPage() {
  const qc = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery<InventoryValue>({
    queryKey:        ['inventory-value'],
    queryFn:         () => api.get('/inventory/value').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  // Real-time refresh on stock events
  useSocket(SocketEvent.stockUpdated, () => void qc.invalidateQueries({ queryKey: ['inventory-value'] }));
  useSocket(SocketEvent.stockLow,     () => void qc.invalidateQueries({ queryKey: ['inventory-value'] }));

  const lowStock    = data?.lowStock    ?? [];
  const outOfStock  = lowStock.filter((p) => p.quantity === 0);
  const critical    = lowStock.filter((p) => p.quantity > 0 && p.quantity <= Math.ceil(p.lowStockAlert * 0.4));
  const warning     = lowStock.filter((p) => p.quantity > Math.ceil(p.lowStockAlert * 0.4));

  const getStockColor = (qty: number, threshold: number) => {
    if (qty === 0)                             return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (qty <= Math.ceil(threshold * 0.4))    return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
  };

  const getStockLabel = (qty: number, threshold: number) => {
    if (qty === 0)                             return 'Out of stock';
    if (qty <= Math.ceil(threshold * 0.4))    return 'Critical';
    return 'Low stock';
  };

  const pct = (qty: number, threshold: number) =>
    Math.min(100, Math.round((qty / threshold) * 100));

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={22} className="text-warning" /> Stock Alerts
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {lowStock.length === 0 ? 'All products well-stocked' : `${lowStock.length} product${lowStock.length !== 1 ? 's' : ''} need attention`}
            {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ''}
          </p>
        </div>
        <button type="button" onClick={() => qc.invalidateQueries({ queryKey: ['inventory-value'] })}
          className="flex items-center gap-2 btn-secondary text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border border-red-500/20">
          <p className="text-3xl font-bold text-red-400">{outOfStock.length}</p>
          <p className="text-xs text-[#94A3B8] mt-1">Out of Stock</p>
        </div>
        <div className="card p-4 text-center border border-orange-500/20">
          <p className="text-3xl font-bold text-orange-400">{critical.length}</p>
          <p className="text-xs text-[#94A3B8] mt-1">Critical</p>
        </div>
        <div className="card p-4 text-center border border-yellow-500/20">
          <p className="text-3xl font-bold text-yellow-400">{warning.length}</p>
          <p className="text-xs text-[#94A3B8] mt-1">Low Stock</p>
        </div>
      </div>

      {/* All good state */}
      {!isLoading && lowStock.length === 0 && (
        <div className="card p-16 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-white font-semibold text-lg">All products are well-stocked</p>
          <p className="text-sm text-[#94A3B8] mt-1">No alerts at this time</p>
        </div>
      )}

      {/* Alert list */}
      {!isLoading && lowStock.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
            <h2 className="font-semibold text-white">Products Needing Restock</h2>
            <span className="text-xs text-[#94A3B8]">Sorted by severity</span>
          </div>
          <div className="divide-y divide-dark-border">
            {[...outOfStock, ...critical, ...warning].map((product) => (
              <div key={product.id} className="flex items-center gap-4 px-5 py-4 hover:bg-dark-card/30 transition-colors">

                {/* Product image / icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-card flex-shrink-0">
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-xl object-cover" />
                    : <Package size={18} className="text-[#94A3B8]" />}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {product.sku && <span className="text-xs text-[#64748B] font-mono">{product.sku}</span>}
                    <span className="text-xs text-[#94A3B8]">{product.category}</span>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', {
                          'bg-red-500':    product.quantity === 0,
                          'bg-orange-500': product.quantity > 0 && product.quantity <= Math.ceil(product.lowStockAlert * 0.4),
                          'bg-yellow-500': product.quantity > Math.ceil(product.lowStockAlert * 0.4),
                        })}
                        style={{ width: `${pct(product.quantity, product.lowStockAlert)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#64748B] whitespace-nowrap">
                      {product.quantity} / {product.lowStockAlert}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span className={clsx(
                  'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border',
                  getStockColor(product.quantity, product.lowStockAlert),
                )}>
                  {getStockLabel(product.quantity, product.lowStockAlert)}
                </span>

              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Loading stock data…</div>}
    </div>
  );
}
