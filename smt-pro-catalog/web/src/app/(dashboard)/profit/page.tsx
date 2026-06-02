'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, DollarSign, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { clsx } from 'clsx';

interface TimelineEntry {
  date:        string;
  revenue:     number;
  cogs:        number;
  expenses:    number;
  grossProfit: number;
  netProfit:   number;
}

interface ProductProfit {
  id:          number;
  name:        string;
  sku:         string | null;
  category:    string;
  revenue:     number;
  cogs:        number;
  grossProfit: number;
  margin:      number;
  unitsSold:   number;
}

interface ProfitData {
  summary: {
    totalRevenue:  number;
    totalCogs:     number;
    totalExpenses: number;
    grossProfit:   number;
    netProfit:     number;
    grossMargin:   number;
  };
  timeline:      TimelineEntry[];
  topProducts:   ProductProfit[];
  worstProducts: ProductProfit[];
}

const RANGES = [
  { label: '7 days',   days: 7 },
  { label: '30 days',  days: 30 },
  { label: '90 days',  days: 90 },
  { label: '12 months', days: 365 },
];

const fmtCurrency = (n: number) =>
  `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const barMax = (entries: TimelineEntry[]) =>
  Math.max(...entries.map((e) => Math.max(e.revenue, 1)), 1);

export default function ProfitPage() {
  const [range, setRange] = useState(30);
  const groupBy = range >= 90 ? 'month' : 'day';

  const to   = new Date().toISOString().split('T')[0]!;
  const from = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

  const { data, isLoading } = useQuery<ProfitData>({
    queryKey: ['profit', range],
    queryFn:  () => api.get(`/reports/profit?from=${from}&to=${to}&groupBy=${groupBy}`).then((r) => r.data.data),
  });

  const s = data?.summary;
  const timeline = data?.timeline ?? [];
  const max = barMax(timeline);

  const summaryCards = s ? [
    { label: 'Revenue',      value: fmtCurrency(s.totalRevenue),  sub: 'Completed orders',        color: 'text-blue-400',   icon: DollarSign,   positive: true },
    { label: 'Cost of Goods', value: fmtCurrency(s.totalCogs),    sub: 'Products cost',           color: 'text-orange-400', icon: Package,      positive: false },
    { label: 'Expenses',     value: fmtCurrency(s.totalExpenses), sub: 'Recorded expenses',       color: 'text-red-400',    icon: TrendingDown, positive: false },
    { label: 'Gross Profit', value: fmtCurrency(s.grossProfit),   sub: `${s.grossMargin}% margin`, color: s.grossProfit >= 0 ? 'text-green-400' : 'text-red-400', icon: TrendingUp, positive: s.grossProfit >= 0 },
    { label: 'Net Profit',   value: `${s.netProfit < 0 ? '-' : ''}${fmtCurrency(s.netProfit)}`, sub: 'After all costs', color: s.netProfit >= 0 ? 'text-primary' : 'text-red-400', icon: s.netProfit >= 0 ? ArrowUpRight : ArrowDownRight, positive: s.netProfit >= 0 },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-primary" /> Profit Analytics
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Revenue, costs and margins</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.days} type="button"
              onClick={() => setRange(r.days)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', range === r.days ? 'bg-primary text-white' : 'btn-secondary')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="p-8 text-center text-[#94A3B8]">Calculating profits…</div>}

      {!isLoading && s && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {summaryCards.map(({ label, value, sub, color, icon: Icon }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-[#94A3B8] uppercase tracking-wide">{label}</p>
                  <Icon size={14} className={color} />
                </div>
                <p className={clsx('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Profit timeline bar chart */}
          {timeline.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-white mb-4">
                {groupBy === 'month' ? 'Monthly' : 'Daily'} Profit Breakdown
              </h2>
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                {timeline.map((entry) => {
                  const revH  = Math.max((entry.revenue / max) * 140, 1);
                  const profH = entry.netProfit >= 0 ? Math.max((entry.netProfit / max) * 140, 1) : 0;
                  const lossH = entry.netProfit < 0  ? Math.max((Math.abs(entry.netProfit) / max) * 140, 1) : 0;
                  return (
                    <div key={entry.date} className="flex flex-col items-center gap-1 flex-shrink-0 group" style={{ minWidth: groupBy === 'month' ? '48px' : '20px' }}>
                      {/* Tooltip */}
                      <div className="hidden group-hover:flex absolute -translate-y-full mb-1 z-10 bg-dark-surface border border-dark-border rounded-lg p-2 text-xs whitespace-nowrap shadow-xl flex-col gap-0.5">
                        <span className="text-white font-semibold">{entry.date}</span>
                        <span className="text-blue-400">Rev: {fmtCurrency(entry.revenue)}</span>
                        <span className={entry.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                          Net: {entry.netProfit < 0 ? '-' : ''}{fmtCurrency(entry.netProfit)}
                        </span>
                      </div>
                      <div className="relative flex items-end gap-px" style={{ height: '140px' }}>
                        {/* Revenue bar */}
                        <div className="w-2 rounded-t bg-blue-500/30" style={{ height: `${revH}px` }} />
                        {/* Profit / Loss bar */}
                        {profH > 0 && <div className="w-2 rounded-t bg-green-400" style={{ height: `${profH}px` }} />}
                        {lossH > 0 && <div className="w-2 rounded-t bg-red-400"   style={{ height: `${lossH}px` }} />}
                      </div>
                      {groupBy === 'month' && (
                        <span className="text-[9px] text-[#64748B] rotate-0">{entry.date.slice(5)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#94A3B8]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500/30 inline-block" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400 inline-block" /> Net Profit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block" /> Net Loss</span>
              </div>
            </div>
          )}

          {/* Top & Worst products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top profit products */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
                <TrendingUp size={15} className="text-green-400" />
                <h2 className="font-semibold text-white text-sm">Top Profit Products</h2>
              </div>
              <div className="divide-y divide-dark-border">
                {data?.topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-[#64748B] w-4 flex-shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{p.name}</p>
                        <p className="text-xs text-[#64748B]">{p.unitsSold} units · {p.margin}% margin</p>
                      </div>
                    </div>
                    <span className="text-green-400 font-bold text-sm flex-shrink-0 ml-2">
                      +{fmtCurrency(p.grossProfit)}
                    </span>
                  </div>
                ))}
                {(data?.topProducts.length ?? 0) === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">No sales data for this period</p>
                )}
              </div>
            </div>

            {/* Worst profit products */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
                <TrendingDown size={15} className="text-red-400" />
                <h2 className="font-semibold text-white text-sm">Lowest Margin Products</h2>
              </div>
              <div className="divide-y divide-dark-border">
                {data?.worstProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-[#64748B] w-4 flex-shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{p.name}</p>
                        <p className="text-xs text-[#64748B]">{p.unitsSold} units · {p.margin}% margin</p>
                      </div>
                    </div>
                    <span className={clsx('font-bold text-sm flex-shrink-0 ml-2', p.grossProfit >= 0 ? 'text-yellow-400' : 'text-red-400')}>
                      {p.grossProfit < 0 ? '-' : '+'}{fmtCurrency(p.grossProfit)}
                    </span>
                  </div>
                ))}
                {(data?.worstProducts.length ?? 0) === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">No sales data for this period</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
