'use client';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent, getSocket } from '@/lib/socket';
import Header from '@/components/layout/Header';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useSyncExternalStore } from 'react';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  Wifi, WifiOff, Clock, ArrowRight, Star,
  CheckCircle2, XCircle, Box, Archive,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  totalStockUnits: number;
  lowStockCount:   number;
  lowStockItems:   LowStockItem[];
  recentOrders:    Array<{ id: number; finalAmount: number; status: string; createdAt: string }>;
  todayOrders:     number;
  pendingOrders:   number;
  completedOrders: number;
}

interface Product {
  id:            number;
  name:          string;
  category:      string;
  price:         number;
  quantity:      number;
  lowStockAlert: number;
  isActive:      boolean;
  imageUrl:      string | null;
  description:   string | null;
  sku:           string | null;
}

interface ProductsResponse {
  products: Product[];
  total:    number;
}

interface Category {
  id:       number;
  name:     string;
  children: Category[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getStockStatus(qty: number, alert: number) {
  if (qty === 0)    return { label: 'Out of Stock', color: 'text-danger',  bg: 'bg-danger/15'  };
  if (qty <= alert) return { label: 'Low Stock',    color: 'text-warning', bg: 'bg-warning/15' };
  return                   { label: 'In Stock',     color: 'text-success', bg: 'bg-success/15' };
}

function flatCategories(cats: Category[]): string[] {
  return cats.flatMap((c) => [c.name, ...flatCategories(c.children ?? [])]);
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-warning/15 text-warning',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, iconBg, valueColor, isCurrency, loading,
}: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; valueColor: string; isCurrency: boolean; loading: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide leading-tight">{label}</p>
        <div className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', iconBg)}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className={clsx('text-2xl font-bold', valueColor)}>
        {loading
          ? <span className="text-[#475569]">—</span>
          : isCurrency
            ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : value.toLocaleString()}
      </p>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { label, color, bg } = getStockStatus(product.quantity, product.lowStockAlert);
  return (
    <div className="card overflow-hidden flex flex-col group hover:border-primary/40 transition-all duration-200 cursor-default">
      {/* Image */}
      <div className="relative h-36 bg-dark-card overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Box size={28} className="text-[#334155]" />
          </div>
        )}
        <span className={clsx(
          'absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm',
          bg, color,
        )}>
          {label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-white truncate leading-tight">{product.name}</p>
        <p className="text-[11px] text-[#64748B] truncate">{product.category}</p>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-border">
          <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
          <span className="text-[11px] text-[#64748B]">{product.quantity} units</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden flex flex-col animate-pulse">
      <div className="h-36 bg-dark-card" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 bg-dark-card rounded w-3/4" />
        <div className="h-2.5 bg-dark-card rounded w-1/2" />
        <div className="mt-2 flex justify-between">
          <div className="h-3 bg-dark-card rounded w-1/4" />
          <div className="h-3 bg-dark-card rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const qc              = useQueryClient();
  const isLive          = useLiveStatus();
  const [activeCategory, setActiveCategory] = useState('All');

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useQuery<DashboardStats>({
    queryKey:        ['dashboard', 'stats'],
    queryFn:         () => fetcher('/reports/dashboard'),
    refetchInterval: 10_000,
  });

  const { data: productsData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery<ProductsResponse>({
    queryKey:        ['dashboard', 'products'],
    queryFn:         () => fetcher('/products?limit=50'),
    refetchInterval: 30_000,
    staleTime:       10_000,
  });

  const { data: categoryTree = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn:  () => fetcher<Category[]>('/categories?tree=true'),
  });

  // ── Socket: instant invalidation ─────────────────────────────────────────
  useSocket(SocketEvent.orderCreated,   () => void qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }));
  useSocket(SocketEvent.orderUpdated,   () => void qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }));
  useSocket(SocketEvent.stockLow,       () => void qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }));
  useSocket(SocketEvent.stockUpdated,   () => {
    void qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    void qc.invalidateQueries({ queryKey: ['dashboard', 'products'] });
  });
  useSocket(SocketEvent.productCreated, () => void qc.invalidateQueries({ queryKey: ['dashboard', 'products'] }));
  useSocket(SocketEvent.productUpdated, () => void qc.invalidateQueries({ queryKey: ['dashboard', 'products'] }));
  useSocket(SocketEvent.productDeleted, () => void qc.invalidateQueries({ queryKey: ['dashboard', 'products'] }));

  // ── Derived data ─────────────────────────────────────────────────────────
  const allProducts      = productsData?.products ?? [];
  const categoryNames    = ['All', ...flatCategories(categoryTree)];
  const filteredProducts = activeCategory === 'All'
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);
  const topProducts      = allProducts.slice(0, 5);
  const lowStockItems    = stats?.lowStockItems ?? [];
  const recentOrders     = stats?.recentOrders ?? [];

  const kpis = [
    { label: "Today's Orders",    value: stats?.todayOrders     ?? 0, icon: Clock,         iconBg: 'bg-blue-500/20',    valueColor: 'text-blue-400',   isCurrency: false },
    { label: 'Monthly Revenue',   value: stats?.totalRevenue    ?? 0, icon: TrendingUp,    iconBg: 'gradient-brand',    valueColor: 'text-primary',    isCurrency: true  },
    { label: 'Total Products',    value: stats?.totalProducts   ?? 0, icon: Package,       iconBg: 'bg-violet-500/20',  valueColor: 'text-violet-400', isCurrency: false },
    { label: 'Units in Stock',    value: stats?.totalStockUnits ?? 0, icon: Archive,       iconBg: 'bg-cyan-500/20',    valueColor: 'text-cyan-400',   isCurrency: false },
    { label: 'Low Stock Alerts',  value: stats?.lowStockCount   ?? 0, icon: AlertTriangle, iconBg: 'bg-warning/20',     valueColor: 'text-warning',    isCurrency: false },
    { label: 'Pending Orders',    value: stats?.pendingOrders   ?? 0, icon: ShoppingCart,  iconBg: 'bg-teal-500/20',    valueColor: 'text-teal-400',   isCurrency: false },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Status bar ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            {dataUpdatedAt
              ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
              : 'Loading…'}
          </p>
          <div className={clsx(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            isLive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400',
          )}>
            {isLive ? (
              <>
                <Wifi size={12} />
                <span>Live</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff size={12} />
                <span>Reconnecting…</span>
              </>
            )}
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} loading={statsLoading} />
          ))}
        </div>

        {/* ── Category Pills ──────────────────────────────────────────── */}
        {categoryNames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {categoryNames.map((cat) => {
              const count = cat === 'All'
                ? allProducts.length
                : allProducts.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={clsx(
                    'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150',
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-dark-card text-[#94A3B8] border border-dark-border hover:border-primary/30 hover:text-white',
                  )}
                >
                  {cat}
                  {count > 0 && (
                    <span className={clsx(
                      'ml-1.5 text-xs',
                      activeCategory === cat ? 'opacity-70' : 'opacity-50',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main grid: product feed + right panel ───────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Product Feed (2/3) */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">
                {activeCategory === 'All' ? 'All Products' : activeCategory}
                <span className="ml-2 text-xs font-normal text-[#64748B]">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <Link
                href="/products"
                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                Manage <ArrowRight size={12} />
              </Link>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : productsError ? (
              <div className="card flex flex-col items-center gap-3 py-14 text-center">
                <AlertTriangle size={32} className="text-warning opacity-60" />
                <p className="text-sm text-[#94A3B8]">Could not load products</p>
                <button type="button" onClick={() => void refetchProducts()}
                  className="text-xs text-primary hover:underline">
                  Retry →
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-14 text-center">
                <Box size={32} className="text-[#334155]" />
                <p className="text-sm text-[#94A3B8]">No products in this category</p>
                <Link href="/products" className="text-xs text-primary hover:underline">
                  Add products →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.slice(0, 12).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {filteredProducts.length > 12 && (
              <Link
                href="/products"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dark-border py-3 text-sm text-[#94A3B8] hover:border-primary/30 hover:text-white transition-all"
              >
                View all {filteredProducts.length} products <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* Right Panel (1/3) */}
          <div className="space-y-4">

            {/* Top Products */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Star size={13} className="text-yellow-400" />
                  Top Products
                </h3>
                <Link href="/products" className="text-xs text-primary hover:opacity-80">All →</Link>
              </div>
              <div className="divide-y divide-dark-border">
                {topProducts.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-center text-[#64748B]">No products yet</p>
                ) : topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-dark-card transition-colors">
                    <span className="w-4 text-xs font-bold text-[#475569] flex-shrink-0">
                      {i + 1}
                    </span>
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg gradient-brand text-white text-xs font-bold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-[#64748B]">{p.category}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-primary">
                      ${p.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock size={13} className="text-[#94A3B8]" />
                  Recent Activity
                </h3>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="divide-y divide-dark-border max-h-56 overflow-y-auto">
                {statsLoading ? (
                  <p className="px-4 py-6 text-xs text-center text-[#64748B]">Loading…</p>
                ) : recentOrders.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-center text-[#64748B]">No recent orders</p>
                ) : recentOrders.map((order) => (
                  <div key={order.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={clsx(
                      'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                      order.status === 'COMPLETED' ? 'bg-success/15' :
                      order.status === 'CANCELLED' ? 'bg-danger/15'  : 'bg-warning/15',
                    )}>
                      {order.status === 'COMPLETED'
                        ? <CheckCircle2 size={12} className="text-success" />
                        : order.status === 'CANCELLED'
                          ? <XCircle size={12} className="text-danger" />
                          : <ShoppingCart size={12} className="text-warning" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white">
                        Order #{order.id}
                        <span className={clsx(
                          'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          STATUS_COLOR[order.status] ?? 'bg-dark-card text-[#94A3B8]',
                        )}>
                          {order.status}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#64748B]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-white">
                      ${order.finalAmount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={13} className="text-warning" />
                  Low Stock
                </h3>
                {!statsLoading && (
                  <span className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    lowStockItems.length > 0
                      ? 'bg-warning/15 text-warning'
                      : 'bg-success/15 text-success',
                  )}>
                    {lowStockItems.length > 0
                      ? `${lowStockItems.length} alert${lowStockItems.length > 1 ? 's' : ''}`
                      : 'All good'}
                  </span>
                )}
              </div>
              <div className="divide-y divide-dark-border max-h-52 overflow-y-auto">
                {statsLoading ? (
                  <p className="px-4 py-6 text-xs text-center text-[#64748B]">Loading…</p>
                ) : lowStockItems.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <Package size={22} className="mx-auto mb-1.5 text-success opacity-50" />
                    <p className="text-xs text-success">All products well-stocked</p>
                  </div>
                ) : lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-dark-card transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{item.name}</p>
                      <p className="text-[10px] text-[#64748B]">{item.sku || '—'}</p>
                    </div>
                    <span className={clsx(
                      'ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                      item.quantity === 0
                        ? 'bg-danger/15 text-danger'
                        : 'bg-warning/15 text-warning',
                    )}>
                      {item.quantity === 0 ? 'Out' : `${item.quantity} left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
