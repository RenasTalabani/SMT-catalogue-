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

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
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
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No orders yet</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{o.id}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{o.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${o.finalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600')}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
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
