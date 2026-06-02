'use client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { fetcher, api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';
import { Plus, X, Package, AlertTriangle, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Movement {
  id:          number;
  type:        string;
  quantity:    number;
  previousQty: number;
  newQty:      number;
  notes:       string | null;
  createdAt:   string;
  product:     { name: string };
  employee:    { name: string };
}
interface InventoryValue {
  totalInventoryValue: number;
  totalProducts:       number;
  lowStockProducts:    { id: number; name: string; category: string; quantity: number }[];
}
interface Product { id: number; name: string; quantity: number }

const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] as const;

const TYPE_STYLE: Record<string, string> = {
  IN:         'bg-success/15 text-success',
  OUT:        'bg-danger/15 text-danger',
  ADJUSTMENT: 'bg-info/15 text-info',
  RETURN:     'bg-warning/15 text-warning',
};

// ── Record Movement Modal ─────────────────────────────────────────────────────
function RecordMovementModal({ open, onClose, products }: {
  open:     boolean;
  onClose:  () => void;
  products: Product[];
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    productId: string; type: string; quantity: number; notes: string;
  }>();

  const mut = useMutation({
    mutationFn: (d: { productId: string; type: string; quantity: number; notes: string }) =>
      api.post('/inventory/movements', {
        productId: Number(d.productId),
        type:      d.type,
        quantity:  Number(d.quantity),
        notes:     d.notes || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['inventory-value'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Movement recorded');
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-dark-surface border border-dark-border shadow-modal">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">Record Stock Movement</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Product *</label>
            <select {...register('productId', { required: true })} className="input">
              <option value="">Select product…</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>
              ))}
            </select>
            {errors.productId && <p className="mt-1 text-xs text-danger">Product required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Movement Type *</label>
            <select {...register('type', { required: true })} className="input">
              <option value="">Select type…</option>
              {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.type && <p className="mt-1 text-xs text-danger">Type required</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Quantity *</label>
            <input {...register('quantity', { required: true, min: 1 })} type="number" min="1" placeholder="0" className="input" />
            {errors.quantity && <p className="mt-1 text-xs text-danger">Quantity must be at least 1</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Optional notes…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Saving…' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: movData, isLoading } = useQuery<{ movements: Movement[] }>({
    queryKey:        ['inventory'],
    queryFn:         () => fetcher('/inventory/movements?limit=100'),
    refetchInterval: 15_000,
  });
  const { data: valData } = useQuery<InventoryValue>({
    queryKey:        ['inventory-value'],
    queryFn:         () => fetcher('/inventory/value?threshold=10'),
    refetchInterval: 30_000,
  });
  const { data: productsResp } = useQuery<{ products: Product[] }>({
    queryKey: ['products-list'],
    queryFn:  () => fetcher('/products?limit=200'),
  });

  useSocket(SocketEvent.stockUpdated, () => {
    void qc.invalidateQueries({ queryKey: ['inventory'] });
    void qc.invalidateQueries({ queryKey: ['inventory-value'] });
  });

  const movements = movData?.movements ?? [];
  const products  = productsResp?.products ?? [];
  const lowStock  = valData?.lowStockProducts ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Inventory" />
      <div className="p-6 space-y-6">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Total Value</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
                <BarChart2 size={18} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">
              ${(valData?.totalInventoryValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Total Products</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-teal">
                <Package size={18} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary">
              {valData?.totalProducts ?? 0}
            </p>
          </div>
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Low Stock</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/20">
                <AlertTriangle size={18} className="text-warning" />
              </div>
            </div>
            <p className={clsx('text-3xl font-bold', lowStock.length > 0 ? 'text-warning' : 'text-success')}>
              {lowStock.length}
            </p>
          </div>
        </div>

        {/* ── Low Stock Alert ── */}
        {lowStock.length > 0 && (
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-6 py-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              <h2 className="font-semibold text-white">Low Stock Items</h2>
            </div>
            <div className="divide-y divide-dark-border">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-dark-card transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-[#94A3B8]">{item.category}</p>
                  </div>
                  <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
                    {item.quantity} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stock Movements ── */}
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Stock Movements</h2>
              <span className="text-xs text-[#94A3B8]">({movements.length})</span>
            </div>
            <button type="button" onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-xl btn-primary px-3 py-2 text-xs">
              <Plus size={14} /> Record Movement
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  {['Product', 'Type', 'Qty', 'Before → After', 'Employee', 'Date'].map((h, i) => (
                    <th key={h} className={clsx(
                      'px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#94A3B8]',
                      i === 0 || i === 4 ? 'text-left' : i === 1 ? 'text-center' : 'text-right',
                      i === 5 && 'text-right',
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#94A3B8]">No stock movements yet</td></tr>
                ) : movements.map((m) => (
                  <tr key={m.id} className="hover:bg-dark-card transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{m.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', TYPE_STYLE[m.type] ?? 'bg-dark-card text-[#94A3B8]')}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">{m.quantity}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{m.previousQty} → {m.newQty}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{m.employee?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{new Date(m.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <RecordMovementModal
        open={showModal}
        onClose={() => setShowModal(false)}
        products={products}
      />
    </div>
  );
}
