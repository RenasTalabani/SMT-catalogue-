'use client';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import Header from '@/components/layout/Header';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface SalesDay  { date: string; revenue: number; orders: number }
interface SalesResp { data: SalesDay[]; totalRevenue: number; totalOrders: number }

const chartGridColor  = '#2D3748';
const chartAxisColor  = '#94A3B8';
const tooltipStyle    = { backgroundColor: '#16213E', border: '1px solid #2D3748', borderRadius: '12px', color: '#F1F5F9' };

export default function ReportsPage() {
  const { data: resp, isLoading } = useQuery<SalesResp>({
    queryKey: ['reports', 'sales'],
    queryFn:  () => fetcher('/reports/sales?groupBy=month'),
  });
  const sales = resp?.data ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Reports" />
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Revenue', value: `$${(resp?.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-primary' },
            { label: 'Total Orders',  value: (resp?.totalOrders ?? 0).toLocaleString(), color: 'text-secondary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-5">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-3">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{isLoading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="mb-5 font-semibold text-white">Monthly Sales Revenue</h2>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center text-[#94A3B8] text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#6C63FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders Chart */}
        <div className="card p-6">
          <h2 className="mb-5 font-semibold text-white">Order Volume</h2>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center text-[#94A3B8] text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="orders" stroke="#00C9A7" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
