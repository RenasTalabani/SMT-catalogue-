'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';
import { FileText, Loader2, Trash2, X } from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

interface Order {
  id:            number;
  totalAmount:   number;
  finalAmount:   number | null;
  discount:      number;
  tax:           number;
  status:        string;
  paymentMethod: string;
  notes:         string | null;
  createdAt:     string;
  user:          { name: string };
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-warning/15 text-warning',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger',
};

export default function OrdersPage() {
  const { user }                          = useAuthStore();
  const isAdmin                           = ['super_admin', 'admin'].includes(user?.role ?? '');
  const qc                                = useQueryClient();
  const [generatingId, setGeneratingId]   = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey:        ['orders'],
    queryFn:         () => fetcher('/orders?limit=50'),
    refetchInterval: 10_000,
  });

  useSocket(SocketEvent.orderCreated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));
  useSocket(SocketEvent.orderUpdated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));

  const orders = data?.orders ?? [];

  const generateInvoice = async (orderId: number, discount: number) => {
    setGeneratingId(orderId);
    try {
      const res = await api.post(`/invoices/order/${orderId}`, {
        ...(discount > 0 ? { discountType: 'FIXED', discountValue: discount } : {}),
      });
      const inv = res.data.data;
      toast.success(`Invoice ${inv.invoiceNumber} created!`);
      // Open PDF preview in new tab
      window.open(`/api/invoices/${inv.id}/preview`, '_blank');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate invoice';
      if (msg.includes('already exists')) {
        toast.error('Invoice already exists for this order');
      } else {
        toast.error(msg);
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/orders/${deleteConfirm.id}`);
      toast.success(`Order #${deleteConfirm.id} deleted`);
      void qc.invalidateQueries({ queryKey: ['orders'] });
      setDeleteConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete order');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Orders" />
      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Delete Order</h3>
              <button type="button" onClick={() => setDeleteConfirm(null)} title="Close"
                className="p-1.5 rounded-lg hover:bg-dark-card text-[#94A3B8] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-[#94A3B8]">
              Permanently delete order <span className="text-primary font-bold">#{deleteConfirm.id}</span>?
              Stock will be restored if the order was not completed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1 text-sm">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">All Orders</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#94A3B8]">{orders.length} orders</span>
              <ExportButton endpoint="/export/orders" filename="orders" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Invoice</th>
                  {isAdmin && <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="py-10 text-center text-[#94A3B8]">No orders yet</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-dark-card transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">#{o.id}</td>
                    <td className="px-4 py-3 text-white">{o.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{o.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">${(o.finalAmount ?? o.totalAmount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[o.status] ?? 'bg-dark-card text-[#94A3B8]')}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => generateInvoice(o.id, o.discount)}
                        disabled={generatingId === o.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors disabled:opacity-50"
                        title="Generate Invoice"
                      >
                        {generatingId === o.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <FileText size={13} />}
                        Invoice
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => setDeleteConfirm(o)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 transition-colors" title="Delete order">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
