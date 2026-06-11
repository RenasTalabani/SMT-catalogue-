'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, X, ChevronRight, Package, Truck,
  CheckCircle, Clock, XCircle, AlertCircle, DollarSign, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface POItem {
  id: number;
  productId: number;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  total: number;
  product: { id: number; name: string; sku: string | null; unit: string };
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  total: number;
  notes: string | null;
  expectedDate: string | null;
  receivedAt: string | null;
  createdAt: string;
  supplier: { id: number; name: string };
  createdBy: { id: number; name: string };
  _count?: { items: number };
  items?: POItem[];
}

interface POStats {
  byStatus: Array<{ status: string; count: number; total: number }>;
  totalSpend: number;
  recentOrders: PurchaseOrder[];
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-500/20 text-gray-400',   icon: Clock },
  SENT:      { label: 'Sent',      cls: 'bg-blue-500/20 text-blue-400',   icon: Truck },
  PARTIAL:   { label: 'Partial',   cls: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle },
  RECEIVED:  { label: 'Received',  cls: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400',     icon: XCircle },
};

const emptyItem = { productId: '', orderedQty: '1', unitCost: '' };

export default function PurchaseOrdersPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const canWrite = ['super_admin', 'admin'].includes(user?.role ?? '');

  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [selectedId, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseOrder | null>(null);

  // Create form state
  const [form, setForm] = useState({
    supplierId: '', notes: '', expectedDate: '',
    items: [{ ...emptyItem }],
  });

  // Receive form state
  const [receivals, setReceivals] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, statusFilter],
    queryFn:  () =>
      api.get(`/purchase-orders?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`)
         .then((r) => r.data.data),
  });

  const { data: stats } = useQuery<POStats>({
    queryKey: ['po-stats'],
    queryFn:  () => api.get('/purchase-orders/stats').then((r) => r.data.data),
  });

  const { data: detail } = useQuery<PurchaseOrder>({
    queryKey: ['po-detail', selectedId],
    queryFn:  () => api.get(`/purchase-orders/${selectedId}`).then((r) => r.data.data),
    enabled:  !!selectedId,
  });

  const orders: PurchaseOrder[] = data?.orders ?? [];
  const total: number           = data?.total   ?? 0;

  const createMutation = useMutation({
    mutationFn: () => api.post('/purchase-orders', {
      supplierId:   Number(form.supplierId),
      notes:        form.notes || undefined,
      expectedDate: form.expectedDate || undefined,
      items: form.items
        .filter((i) => i.productId && i.orderedQty && i.unitCost)
        .map((i) => ({ productId: Number(i.productId), orderedQty: Number(i.orderedQty), unitCost: Number(i.unitCost) })),
    }).then((r) => r.data.data),
    onSuccess: (po: PurchaseOrder) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success(`PO ${po.poNumber} created`);
      setShowCreate(false);
      setForm({ supplierId: '', notes: '', expectedDate: '', items: [{ ...emptyItem }] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/purchase-orders/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['po-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${selectedId}/receive`, {
      items: Object.entries(receivals)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([id, qty]) => ({ purchaseOrderItemId: Number(id), receivedQty: Number(qty) })),
    }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['po-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success('Goods received');
      setShowReceive(false);
      setReceivals({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success('Purchase order deleted');
      setDeleteConfirm(null);
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem    = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setItem    = (i: number, k: string, v: string) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [k]: v } : item) }));

  const formTotal = form.items.reduce((s, i) => s + (Number(i.orderedQty) || 0) * (Number(i.unitCost) || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total} order{total !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 btn-primary text-sm">
            <Plus size={15} /> New PO
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-4 md:col-span-1">
            <DollarSign size={18} className="text-primary mb-1" />
            <p className="text-xl font-bold text-white">${stats.totalSpend.toLocaleString()}</p>
            <p className="text-xs text-[#94A3B8]">Total Spend</p>
          </div>
          {stats.byStatus.map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <div key={status} className="card p-4 cursor-pointer hover:border-dark-border border border-transparent transition-all"
                onClick={() => { setStatus(statusFilter === status ? '' : status); setPage(1); }}>
                <Icon size={16} className={cfg.cls.split(' ')[1]} />
                <p className="text-xl font-bold text-white mt-1">{count}</p>
                <p className="text-xs text-[#94A3B8]">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {/* Filter bar */}
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[statusFilter]?.cls ?? ''}`}>
                {STATUS_CONFIG[statusFilter]?.label}
              </span>
              <button type="button" onClick={() => setStatus('')} className="text-xs text-[#94A3B8] hover:text-white">
                × clear filter
              </button>
            </div>
          )}

          {isLoading && <div className="card p-8 text-center text-[#94A3B8]">Loading…</div>}
          {!isLoading && orders.length === 0 && (
            <div className="card p-12 text-center">
              <ShoppingBag size={40} className="mx-auto text-[#94A3B8] opacity-40 mb-3" />
              <p className="text-[#94A3B8]">No purchase orders yet.</p>
            </div>
          )}

          {orders.map((po) => {
            const cfg  = STATUS_CONFIG[po.status] ?? STATUS_CONFIG['DRAFT'];
            const Icon = cfg.icon;
            return (
              <div key={po.id}
                onClick={() => setSelected(po.id === selectedId ? null : po.id)}
                className={`card p-4 cursor-pointer transition-all border ${
                  selectedId === po.id ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-dark-border'
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-card flex-shrink-0">
                      <ShoppingBag size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold">{po.poNumber}</p>
                      <p className="text-xs text-[#94A3B8]">{po.supplier.name} · {po._count?.items ?? 0} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-white font-bold">${po.total.toLocaleString()}</p>
                      <p className="text-xs text-[#64748B]">{new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>
                      <Icon size={10} />{cfg.label}
                    </span>
                    <ChevronRight size={14} className={`text-[#94A3B8] transition-transform ${selectedId === po.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
            );
          })}

          {total > 20 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-[#94A3B8]">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
                  className="btn-secondary text-sm disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {!detail ? (
            <div className="card p-8 text-center text-[#94A3B8] text-sm">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
              Select a PO to view details
            </div>
          ) : (
            <>
              <div className="card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">{detail.poNumber}</p>
                    <p className="text-sm text-[#94A3B8]">{detail.supplier.name}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[detail.status]?.cls ?? ''}`}>
                    {STATUS_CONFIG[detail.status]?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">Total</span>
                  <span className="text-white font-bold">${detail.total.toLocaleString()}</span>
                </div>
                {detail.expectedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8]">Expected</span>
                    <span className="text-white">{new Date(detail.expectedDate).toLocaleDateString()}</span>
                  </div>
                )}
                {detail.notes && <p className="text-xs text-[#64748B] italic">{detail.notes}</p>}

                {/* Action buttons */}
                {canWrite && (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {detail.status === 'DRAFT' && (
                      <>
                        <button type="button"
                          onClick={() => statusMutation.mutate({ id: detail.id, status: 'SENT' })}
                          className="btn-primary text-xs flex-1">Send to Supplier</button>
                        <button type="button"
                          onClick={() => { if (confirm('Cancel this PO?')) statusMutation.mutate({ id: detail.id, status: 'CANCELLED' }); }}
                          className="btn-secondary text-xs">Cancel</button>
                      </>
                    )}
                    {(detail.status === 'SENT' || detail.status === 'PARTIAL') && (
                      <>
                        <button type="button"
                          onClick={() => { setShowReceive(true); setReceivals({}); }}
                          className="btn-primary text-xs flex-1">Receive Goods</button>
                        <button type="button"
                          onClick={() => { if (confirm('Cancel this PO?')) statusMutation.mutate({ id: detail.id, status: 'CANCELLED' }); }}
                          className="btn-secondary text-xs">Cancel</button>
                      </>
                    )}
                    <button type="button" onClick={() => setDeleteConfirm(detail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors">
                      <Trash2 size={12} /> Delete PO
                    </button>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-dark-border">
                  <p className="text-sm font-semibold text-white">Items ({detail.items?.length ?? 0})</p>
                </div>
                <div className="divide-y divide-dark-border">
                  {detail.items?.map((item) => {
                    const pct = item.orderedQty > 0 ? (item.receivedQty / item.orderedQty) * 100 : 0;
                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-[#64748B]">${item.unitCost} × {item.orderedQty} {item.product.unit}</p>
                          </div>
                          <p className="text-sm font-bold text-white flex-shrink-0">${item.total.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-yellow-500' : 'bg-dark-card'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[#94A3B8] flex-shrink-0">
                            {item.receivedQty}/{item.orderedQty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreate && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Purchase Order</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Supplier ID *</label>
                <input className="input w-full" type="number" placeholder="e.g. 1"
                  value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Expected Date</label>
                <input className="input w-full" type="date"
                  value={form.expectedDate} onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))} />
              </div>
            </div>
            <textarea className="input w-full resize-none" rows={2} placeholder="Notes (optional)"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Items</p>
                <button type="button" onClick={addItem} className="text-xs text-primary hover:underline">+ Add item</button>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs text-[#64748B] px-1">
                <span className="col-span-5">Product ID</span>
                <span className="col-span-3">Qty</span>
                <span className="col-span-3">Unit Cost</span>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-5" type="number" placeholder="Product ID"
                    value={item.productId} onChange={(e) => setItem(i, 'productId', e.target.value)} />
                  <input className="input col-span-3" type="number" min="1" placeholder="Qty"
                    value={item.orderedQty} onChange={(e) => setItem(i, 'orderedQty', e.target.value)} />
                  <input className="input col-span-3" type="number" step="0.01" placeholder="Cost"
                    value={item.unitCost} onChange={(e) => setItem(i, 'unitCost', e.target.value)} />
                  <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-[#94A3B8] hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end">
                <p className="text-sm text-[#94A3B8]">Total: <span className="text-white font-bold">${formTotal.toFixed(2)}</span></p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={!form.supplierId || form.items.every((i) => !i.productId) || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {createMutation.isPending ? 'Creating…' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Delete Purchase Order</h3>
              <button type="button" onClick={() => setDeleteConfirm(null)} title="Close"
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-[#94A3B8]">
              Permanently delete <span className="text-primary font-bold">{deleteConfirm.poNumber}</span>?
              All items and ratings will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="button"
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {showReceive && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-primary" /> Receive Goods
              </h2>
              <button type="button" onClick={() => setShowReceive(false)} title="Close" className="text-[#94A3B8] hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#94A3B8]">{detail.poNumber} — enter received quantities</p>
            <div className="space-y-3">
              {detail.items?.filter((i) => i.receivedQty < i.orderedQty).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-[#64748B]">Remaining: {item.orderedQty - item.receivedQty} {item.product.unit}</p>
                  </div>
                  <input type="number" min="0" max={item.orderedQty - item.receivedQty}
                    className="input w-24 text-center"
                    placeholder="0"
                    value={receivals[item.id] ?? ''}
                    onChange={(e) => setReceivals((r) => ({ ...r, [item.id]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setShowReceive(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button"
                disabled={Object.values(receivals).every((v) => !Number(v)) || receiveMutation.isPending}
                onClick={() => receiveMutation.mutate()}
                className="btn-primary text-sm disabled:opacity-40">
                {receiveMutation.isPending ? 'Saving…' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
