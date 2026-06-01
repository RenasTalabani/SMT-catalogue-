'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';
import { FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id:            number;
  finalAmount:   number;
  status:        string;
  paymentMethod: string;
  createdAt:     string;
  user:          { name: string };
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-warning/15 text-warning',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger',
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders'],
    queryFn:  () => fetcher('/orders?limit=50'),
  });

  useSocket(SocketEvent.orderCreated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));
  useSocket(SocketEvent.orderUpdated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));

  const orders = data?.orders ?? [];

  const generateInvoice = async (orderId: number) => {
    setGeneratingId(orderId);
    try {
      const res = await api.post(`/invoices/order/${orderId}`);
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

  return (
    <div className="flex flex-col">
      <Header title="Orders" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">All Orders</h2>
            <span className="text-xs text-[#94A3B8]">{orders.length} orders</span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-[#94A3B8]">No orders yet</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-dark-card transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">#{o.id}</td>
                    <td className="px-4 py-3 text-white">{o.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{o.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">${o.finalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[o.status] ?? 'bg-dark-card text-[#94A3B8]')}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => generateInvoice(o.id)}
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
