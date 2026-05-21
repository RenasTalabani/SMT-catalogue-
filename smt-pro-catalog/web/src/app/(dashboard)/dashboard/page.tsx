'use client';
import React from 'react';
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

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn:  () => fetcher('/reports/dashboard'),
  });

  useSocket(SocketEvent.orderCreated, () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));
  useSocket(SocketEvent.stockLow,     () => void qc.invalidateQueries({ queryKey: ['dashboard'] }));

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />

      <div className="p-6 space-y-6">
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

        {/* Recent Orders */}
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Orders</h2>
            <span className="text-xs text-[#94A3B8]">Live</span>
          </div>
          <div className="divide-y divide-dark-border">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-[#94A3B8]">Loading…</div>
            ) : (data?.recentOrders ?? []).length === 0 ? (
              <div className="py-10 text-center text-sm text-[#94A3B8]">No orders yet</div>
            ) : (
              data!.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-dark-card transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">Order #{order.id}</p>
                    <p className="text-xs text-[#94A3B8]">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
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
      </div>
    </div>
  );
}
