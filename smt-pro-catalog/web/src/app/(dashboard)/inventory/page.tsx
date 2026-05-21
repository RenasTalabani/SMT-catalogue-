'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { clsx } from 'clsx';

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

const TYPE_STYLE: Record<string, string> = {
  IN:         'bg-success/15 text-success',
  OUT:        'bg-danger/15 text-danger',
  ADJUSTMENT: 'bg-info/15 text-info',
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
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Stock Movements</h2>
            <span className="text-xs text-[#94A3B8]">{movements.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Before → After</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Employee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#94A3B8]">Date</th>
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
    </div>
  );
}
