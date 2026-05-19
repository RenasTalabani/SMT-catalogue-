'use client';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import Header from '@/components/layout/Header';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FinanceSummary {
  totalIncome:   number;
  totalExpenses: number;
  netProfit:     number;
  incomes:  Array<{ id: number; amount: number; source: string; createdAt: string }>;
  expenses: Array<{ id: number; amount: number; category: string; createdAt: string }>;
}

export default function FinancePage() {
  const { data, isLoading } = useQuery<FinanceSummary>({
    queryKey: ['finance'],
    queryFn:  () => fetcher('/finance/summary'),
  });

  return (
    <div className="flex flex-col">
      <Header title="Finance" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Income',   value: data?.totalIncome,   icon: TrendingUp,   color: 'text-green-600' },
            { label: 'Total Expenses', value: data?.totalExpenses, icon: TrendingDown, color: 'text-red-600'   },
            { label: 'Net Profit',     value: data?.netProfit,     icon: TrendingUp,   color: (data?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{label}</p>
                <Icon size={18} className={color} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>
                {isLoading ? '—' : `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="grid grid-cols-2 gap-4">
          {/* Incomes */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Incomes</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(data?.incomes ?? []).slice(0, 10).map((i) => (
                <div key={i.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{i.source}</p>
                    <p className="text-xs text-gray-500">{new Date(i.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">+${i.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Expenses</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(data?.expenses ?? []).slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{e.category}</p>
                    <p className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">-${e.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
