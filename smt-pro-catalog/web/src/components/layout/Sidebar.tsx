'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse,
  TrendingUp, BarChart3, Settings, LogOut, Package2, Tag, X,
  FileText, Store, Users, ShieldCheck, UserCheck, ClipboardList, Truck, BellRing, BarChart2, PieChart,
  Zap, Star,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';

type NavItem = {
  href:  string;
  label: string;
  icon:  React.ElementType;
  roles?: string[]; // undefined = all authenticated users
};

const nav: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/products',   label: 'Products',   icon: Package },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/orders',     label: 'Orders',     icon: ShoppingCart },
  { href: '/invoices',   label: 'Invoices',   icon: FileText },
  { href: '/customers',  label: 'Customers',  icon: UserCheck },
  { href: '/suppliers',        label: 'Suppliers',        icon: Truck },
  { href: '/supplier-ratings', label: 'Supplier Ratings',  icon: Star,  roles: ['super_admin', 'admin', 'employee'] },
  { href: '/inventory',        label: 'Inventory',         icon: Warehouse },
  { href: '/flash-sales',      label: 'Flash Sales',       icon: Zap,   roles: ['super_admin', 'admin'] },
  { href: '/stock-alerts', label: 'Stock Alerts', icon: BellRing },
  { href: '/finance',      label: 'Finance',      icon: TrendingUp,  roles: ['super_admin', 'admin'] },
  { href: '/reports',      label: 'Reports',      icon: BarChart3,   roles: ['super_admin', 'admin'] },
  { href: '/performance',  label: 'Performance',  icon: BarChart2,   roles: ['super_admin', 'admin'] },
  { href: '/profit',       label: 'Profit',       icon: PieChart,    roles: ['super_admin', 'admin'] },
  { href: '/users',      label: 'Users',      icon: Users,         roles: ['super_admin', 'admin'] },
  { href: '/roles',      label: 'Roles',      icon: ShieldCheck,   roles: ['super_admin', 'admin'] },
  { href: '/audit',      label: 'Audit Logs', icon: ClipboardList, roles: ['super_admin', 'admin'] },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

const externalNav = [
  { href: '/shop', label: 'Customer Shop', icon: Store },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const role = user?.role ?? '';

  const visibleNav = nav.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  const inner = (
    <aside className="flex h-full w-64 flex-col bg-dark-surface border-r border-dark-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-dark-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand glow-primary">
          <Package2 size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">DaralIraq</p>
          <p className="text-[10px] text-dark-border uppercase tracking-widest">Enterprise</p>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close menu"
            aria-label="Close menu"
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-dark-card"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
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

      {/* External links */}
      <div className="border-t border-dark-border px-3 py-2">
        {externalNav.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#94A3B8] hover:bg-dark-card hover:text-white transition-all duration-150">
            <Icon size={18} strokeWidth={1.8} />
            {label}
            <span className="ml-auto text-[10px] text-[#64748B]">↗</span>
          </a>
        ))}
      </div>

      {/* User */}
      <div className="border-t border-dark-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-[#94A3B8] capitalize">{user?.role?.replace('_', ' ')}</p>
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

  return (
    <>
      {/* Desktop — always visible */}
      <div className="hidden md:flex h-screen w-64 flex-shrink-0">
        {inner}
      </div>

      {/* Mobile — overlay drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 h-full md:hidden">
            {inner}
          </div>
        </>
      )}
    </>
  );
}
