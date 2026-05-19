'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';

interface Movement {
  id:         number;
  type:       string;
  quantity:   number;
  previousQty: number;
  newQty:     number;
  notes:      string | null;
  createdAt:  string;
  product:    { name: string };
  employee:   { name: string };
}

const TYPE_COLOR: Record<string, string> = {
  IN:         'bg-green-100 text-green-800',
  OUT:        'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-blue-100 text-blue-800',
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ movements: Movement[] }>({
    queryKey: ['inventory'],
    queryFn:  () => fetcher('/inventory?limit=50'),
  });

  useSocket(SocketEvent.stockUpdated, () => void qc.invalidateQueries({ queryKey: ['inventory'] }));

  const movements = data?.movements ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Inventory" />
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Before → After</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Employee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No stock movements yet</td></tr>
                ) : movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLOR[m.type] ?? 'bg-gray-100 text-gray-600')}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{m.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{m.previousQty} → {m.newQty}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.employee?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
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
