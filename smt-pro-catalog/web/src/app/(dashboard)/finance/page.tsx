'use client';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import Header from '@/components/layout/Header';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

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

  const profit = data?.netProfit ?? 0;

  const summaryCards = [
    { label: 'Total Income',   value: data?.totalIncome,   icon: TrendingUp,   iconBg: 'gradient-teal',  valueColor: 'text-secondary' },
    { label: 'Total Expenses', value: data?.totalExpenses, icon: TrendingDown, iconBg: 'bg-danger/20',   valueColor: 'text-danger' },
    { label: 'Net Profit',     value: profit,              icon: DollarSign,   iconBg: profit >= 0 ? 'gradient-brand' : 'bg-danger/20', valueColor: profit >= 0 ? 'text-primary' : 'text-danger' },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Finance" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {summaryCards.map(({ label, value, icon: Icon, iconBg, valueColor }) => (
            <div key={label} className="card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className={clsx('text-3xl font-bold', valueColor)}>
                {isLoading ? <span className="text-[#94A3B8]">—</span> : `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Incomes */}
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-secondary" />
              <h3 className="font-semibold text-white">Incomes</h3>
            </div>
            <div className="divide-y divide-dark-border">
              {(data?.incomes ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-[#94A3B8]">No income records</div>
              ) : (data?.incomes ?? []).slice(0, 10).map((i) => (
                <div key={i.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{i.source}</p>
                    <p className="text-xs text-[#94A3B8]">{new Date(i.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-secondary">+${i.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex items-center gap-2">
              <TrendingDown size={16} className="text-danger" />
              <h3 className="font-semibold text-white">Expenses</h3>
            </div>
            <div className="divide-y divide-dark-border">
              {(data?.expenses ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-[#94A3B8]">No expense records</div>
              ) : (data?.expenses ?? []).slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{e.category}</p>
                    <p className="text-xs text-[#94A3B8]">{new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-danger">-${e.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
