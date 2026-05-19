'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardStats {
  totalProducts: number;
  totalOrders:   number;
  totalRevenue:  number;
  lowStockCount: number;
  recentOrders:  Array<{ id: number; finalAmount: number; status: string; createdAt: string }>;
}

const statCards = [
  { key: 'totalProducts', label: 'Total Products',    icon: Package,       color: 'blue'   },
  { key: 'totalOrders',   label: 'Total Orders',      icon: ShoppingCart,  color: 'green'  },
  { key: 'totalRevenue',  label: 'Revenue (month)',   icon: TrendingUp,    color: 'purple' },
  { key: 'lowStockCount', label: 'Low Stock Alerts',  icon: AlertTriangle, color: 'red'    },
] as const;

const colorMap = {
  blue:   'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  green:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  red:    'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn:  () => fetcher('/reports/dashboard'),
  });

  useSocket(SocketEvent.orderCreated, () => {
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  });
  useSocket(SocketEvent.stockLow, () => {
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  });

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <div className={clsx('rounded-lg p-2', colorMap[color])}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? '—' : (
                  key === 'totalRevenue'
                    ? `$${(data?.[key] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : (data?.[key] ?? 0).toLocaleString()
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
            ) : (data?.recentOrders ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No orders yet</div>
            ) : (
              data!.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[order.status] ?? 'bg-gray-100 text-gray-800')}>
                      {order.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${order.finalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
