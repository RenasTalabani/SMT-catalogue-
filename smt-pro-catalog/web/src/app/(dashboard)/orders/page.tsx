'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';

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
  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders'],
    queryFn:  () => fetcher('/orders?limit=50'),
  });

  useSocket(SocketEvent.orderCreated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));
  useSocket(SocketEvent.orderUpdated, () => void qc.invalidateQueries({ queryKey: ['orders'] }));

  const orders = data?.orders ?? [];

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
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#94A3B8]">No orders yet</td></tr>
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
