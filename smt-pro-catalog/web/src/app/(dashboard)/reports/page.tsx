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
        {/* Sales Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Monthly Sales Revenue</h2>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-400 text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Order Volume</h2>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-400 text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
