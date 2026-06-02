'use client';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import Header from '@/components/layout/Header';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { clsx } from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SalesDay      { date: string; revenue: number; orders: number }
interface SalesResp     { data: SalesDay[]; totalRevenue: number; totalOrders: number }
interface TopProduct    { id: number; name: string; category: string; totalSold: number; totalRevenue: number }
interface CategoryItem  { category: string; count: number; revenue?: number }
interface ProfitLoss    { totalRevenue: number; totalExpenses: number; totalManualIncome: number; netProfit: number; profitMargin: number }
interface AuditLog      { id: number; action: string; entity: string; entityId?: number; userId: number; createdAt: string; user?: { name: string } }

// ── Constants ─────────────────────────────────────────────────────────────────
const CHART_GRID  = '#2D3748';
const CHART_AXIS  = '#94A3B8';
const TOOLTIP_STYLE = { backgroundColor: '#16213E', border: '1px solid #2D3748', borderRadius: '12px', color: '#F1F5F9' };
const PIE_COLORS  = ['#6366F1', '#00C9A7', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'];

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'bg-success/15 text-success',
  UPDATE: 'bg-info/15 text-info',
  DELETE: 'bg-danger/15 text-danger',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="mb-5 font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { data: salesResp, isLoading: loadingSales } = useQuery<SalesResp>({
    queryKey: ['reports', 'sales'],
    queryFn:  () => fetcher('/reports/sales?groupBy=month'),
  });
  const { data: topProducts = [], isLoading: loadingTop } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'top-products'],
    queryFn:  () => fetcher('/reports/top-products'),
  });
  const { data: catBreakdown = [], isLoading: loadingCat } = useQuery<CategoryItem[]>({
    queryKey: ['reports', 'category-breakdown'],
    queryFn:  () => fetcher('/reports/category-breakdown'),
  });
  const { data: pl, isLoading: loadingPL } = useQuery<ProfitLoss>({
    queryKey: ['reports', 'profit-loss'],
    queryFn:  () => fetcher('/finance/profit-loss'),
  });
  const { data: auditResp, isLoading: loadingAudit } = useQuery<{ logs: AuditLog[] } | AuditLog[]>({
    queryKey: ['reports', 'audit'],
    queryFn:  () => fetcher('/reports/audit'),
  });

  const sales  = salesResp?.data ?? [];
  const audits = Array.isArray(auditResp) ? auditResp : (auditResp as { logs: AuditLog[] } | undefined)?.logs ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Reports" />
      <div className="p-6 space-y-6">

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Revenue',  value: `$${(salesResp?.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-primary'   },
            { label: 'Total Orders',   value: (salesResp?.totalOrders ?? 0).toLocaleString(),                                              color: 'text-secondary' },
            { label: 'Net Profit',     value: `$${(pl?.netProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,           color: (pl?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-danger' },
            { label: 'Profit Margin',  value: `${(pl?.profitMargin ?? 0).toFixed(1)}%`,                                                    color: (pl?.profitMargin ?? 0) >= 0 ? 'text-success' : 'text-danger' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-5">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-3">{label}</p>
              <p className={clsx('text-2xl font-bold', color)}>{loadingSales || loadingPL ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* ── Profit / Loss Breakdown ── */}
        <SectionCard title="Profit / Loss Breakdown">
          {loadingPL ? (
            <div className="h-16 flex items-center justify-center text-[#94A3B8] text-sm">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Revenue (orders)',  value: pl?.totalRevenue,      color: 'text-secondary' },
                { label: 'Manual Income',     value: pl?.totalManualIncome, color: 'text-info'      },
                { label: 'Total Expenses',    value: pl?.totalExpenses,     color: 'text-danger'    },
                { label: 'Net Profit',        value: pl?.netProfit,         color: (pl?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-danger' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-dark-card p-4">
                  <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
                  <p className={clsx('text-xl font-bold', color)}>${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Revenue Chart ── */}
        <SectionCard title="Monthly Sales Revenue">
          {loadingSales ? (
            <div className="flex h-60 items-center justify-center text-[#94A3B8] text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Orders Chart ── */}
        <SectionCard title="Order Volume">
          {loadingSales ? (
            <div className="flex h-60 items-center justify-center text-[#94A3B8] text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="orders" stroke="#00C9A7" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Top Products + Category Breakdown ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Top Products */}
          <SectionCard title="Top Products by Revenue">
            {loadingTop ? (
              <div className="h-40 flex items-center justify-center text-[#94A3B8] text-sm">Loading…</div>
            ) : topProducts.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#94A3B8] text-sm">No sales data yet</div>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 8).map((p, i) => {
                  const max = topProducts[0]?.totalRevenue ?? 1;
                  const pct = Math.round((p.totalRevenue / max) * 100);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-[#94A3B8] text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white truncate">{p.name}</p>
                          <span className="ml-3 text-xs text-[#94A3B8] whitespace-nowrap">{p.totalSold} sold</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-dark-card overflow-hidden">
                          <div className="bar-fill h-full rounded-full bg-primary transition-all" style={{ '--bar-pct': `${pct}%` } as React.CSSProperties} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">${p.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Category Breakdown */}
          <SectionCard title="Sales by Category">
            {loadingCat ? (
              <div className="h-40 flex items-center justify-center text-[#94A3B8] text-sm">Loading…</div>
            ) : catBreakdown.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#94A3B8] text-sm">No category data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={catBreakdown}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {catBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: CHART_AXIS }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* ── Audit Log ── */}
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Audit Log</h2>
            <span className="text-xs text-[#94A3B8]">{audits.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-surface">
                  {['Action', 'Entity', 'ID', 'User', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {loadingAudit ? (
                  <tr><td colSpan={5} className="py-10 text-center text-[#94A3B8]">Loading…</td></tr>
                ) : audits.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-[#94A3B8]">No audit entries</td></tr>
                ) : audits.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-dark-card transition-colors">
                    <td className="px-4 py-3">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', ACTION_STYLE[log.action] ?? 'bg-dark-card text-[#94A3B8]')}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{log.entity}</td>
                    <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">{log.entityId ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{log.user?.name ?? `User #${log.userId}`}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{new Date(log.createdAt).toLocaleString()}</td>
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
