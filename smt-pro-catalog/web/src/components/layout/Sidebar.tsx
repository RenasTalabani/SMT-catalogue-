'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse,
  TrendingUp, BarChart3, Settings, LogOut, Package2, Tag,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';

const nav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/products',   label: 'Products',   icon: Package },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/orders',     label: 'Orders',     icon: ShoppingCart },
  { href: '/inventory',  label: 'Inventory',  icon: Warehouse },
  { href: '/finance',    label: 'Finance',    icon: TrendingUp },
  { href: '/reports',    label: 'Reports',    icon: BarChart3 },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-64 flex-col bg-dark-surface border-r border-dark-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-dark-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand glow-primary">
          <Package2 size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">DaralIraq</p>
          <p className="text-[10px] text-dark-border uppercase tracking-widest">Enterprise</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-[#94A3B8] hover:bg-dark-card hover:text-white',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-dark-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-[#94A3B8] capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#94A3B8] hover:bg-dark-card hover:text-danger transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
