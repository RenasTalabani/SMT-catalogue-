'use client';
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket, useSocketConnect } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import Header from '@/components/layout/Header';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  Wifi, WifiOff,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getSocket } from '@/lib/socket';
import { useSyncExternalStore } from 'react';

interface LowStockItem {
  id:       number;
  name:     string;
  sku:      string;
  quantity: number;
}

interface DashboardStats {
  totalProducts:   number;
  totalOrders:     number;
  totalRevenue:    number;
  lowStockCount:   number;
  lowStockItems:   LowStockItem[];
  recentOrders:    Array<{ id: number; finalAmount: number; status: string; createdAt: string }>;
  todayOrders:     number;
  pendingOrders:   number;
  completedOrders: number;
}

interface StatCard {
  key:        keyof Pick<DashboardStats, 'totalProducts' | 'totalOrders' | 'totalRevenue' | 'lowStockCount'>;
  label:      string;
  icon:       React.ElementType;
  iconBg:     string;
  glow:       string;
  valueColor: string;
  isCurrency: boolean;
}

const statCards: StatCard[] = [
  { key: 'totalProducts', label: 'Total Products',   icon: Package,       iconBg: 'gradient-brand', glow: 'glow-primary', valueColor: 'text-primary',   isCurrency: false },
  { key: 'totalOrders',   label: 'Total Orders',     icon: ShoppingCart,  iconBg: 'gradient-teal',  glow: '',             valueColor: 'text-secondary', isCurrency: false },
  { key: 'totalRevenue',  label: 'Revenue (month)',  icon: TrendingUp,    iconBg: 'gradient-brand', glow: '',             valueColor: 'text-primary',   isCurrency: true  },
  { key: 'lowStockCount', label: 'Low Stock Alerts', icon: AlertTriangle, iconBg: 'bg-warning/20',  glow: '',             valueColor: 'text-warning',   isCurrency: false },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-warning/15 text-warning',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger',
};

// Live connection indicator using socket state
function useLiveStatus() {
  return useSyncExternalStore(
    (cb) => {
      const s = getSocket();
      s.on('connect', cb);
      s.on('disconnect', cb);
      return () => { s.off('connect', cb); s.off('disconnect', cb); };
    },
    () => getSocket().connected,
    () => false,
  );
}

export default function DashboardPage() {
  const qc      = useQueryClient();
  const isLive  = useLiveStatus();

  useSocketConnect();

  const { data, isLoading, dataUpdatedAt } = useQuery<DashboardStats>({
    queryKey:        ['dashboard', 'stats'],
    queryFn:         () => fetcher('/reports/dashboard'),
    refetchInterval: 10_000,
  });

  // Invalidate on socket events for instant update
  useSocket(SocketEvent.orderCreated, () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocket(SocketEvent.orderUpdated, () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocket(SocketEvent.stockLow,     () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocket(SocketEvent.stockUpdated, () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));

  const lowStockItems = data?.lowStockItems ?? [];

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Live status bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#94A3B8]">
            {dataUpdatedAt ? `Last updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Loading…'}
          </p>
          <div className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            isLive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400',
          )}>
            {isLive ? (
              <><Wifi size={12} /><span>Live</span><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /></>
            ) : (
              <><WifiOff size={12} /><span>Reconnecting…</span></>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {statCards.map(({ key, label, icon: Icon, iconBg, glow, valueColor, isCurrency }) => (
            <div key={key} className="card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', iconBg, glow)}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className={clsx('text-3xl font-bold', valueColor)}>
                {isLoading ? (
                  <span className="text-[#94A3B8]">—</span>
                ) : isCurrency ? (
                  `$${(data?.[key] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                ) : (
                  (data?.[key] ?? 0).toLocaleString()
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom grid: recent orders + low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent Orders — takes 2/3 */}
          <div className="card overflow-hidden lg:col-span-2">
            <div className="border-b border-dark-border px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Orders</h2>
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Auto-refreshing
              </span>
            </div>
            <div className="divide-y divide-dark-border">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-[#94A3B8]">Loading…</div>
              ) : (data?.recentOrders ?? []).length === 0 ? (
                <div className="py-10 text-center text-sm text-[#94A3B8]">No orders yet</div>
              ) : (
                data!.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">Order #{order.id}</p>
                      <p className="text-xs text-[#94A3B8]">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[order.status] ?? 'bg-dark-card text-[#94A3B8]')}>
                        {order.status}
                      </span>
                      <span className="text-sm font-bold text-white">${order.finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alerts — takes 1/3 */}
          <div className="card overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                Low Stock
              </h2>
              {!isLoading && (
                <span className={clsx(
                  'rounded-full px-2 py-0.5 text-xs font-bold',
                  lowStockItems.length > 0 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success',
                )}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} alert${lowStockItems.length !== 1 ? 's' : ''}` : 'All good'}
                </span>
              )}
            </div>
            <div className="divide-y divide-dark-border">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-[#94A3B8]">Loading…</div>
              ) : lowStockItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-success">
                  <Package size={28} className="mx-auto mb-2 opacity-50" />
                  All products well-stocked
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-card transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-xs text-[#94A3B8]">{item.sku}</p>
                    </div>
                    <span className={clsx(
                      'ml-3 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold',
                      item.quantity === 0 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning',
                    )}>
                      {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
