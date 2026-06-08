'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, LogIn, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import { useSocketConnect } from '@/hooks/useSocket';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSocketConnect();
  useRealtimeNotifications();

  // ── Guest layout — read-only, no sidebar ──────────────────────────────────
  if (!token) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-dark-bg">
        {/* Guest top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-dark-border bg-dark-surface px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark">
              <Package size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">DaralIraq</span>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Guest View
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <LogIn size={15} />
            Sign In
          </Link>
        </header>

        {/* Info banner */}
        <div className="shrink-0 border-b border-dark-border bg-primary/5 px-4 py-2 text-center text-xs text-primary">
          Browsing as guest — prices and product info are visible. Sign in for full access.
        </div>

        <main className="flex-1 overflow-y-auto bg-dark-bg">
          {children}
        </main>

        <footer className="shrink-0 border-t border-dark-border bg-dark-surface px-4 py-2 text-center text-xs text-[#475569]">
          © {new Date().getFullYear()} All rights reserved · Created by{' '}
          <span className="font-semibold text-primary">Renas Talabani</span>
        </footer>
      </div>
    );
  }

  // ── Authenticated layout — full sidebar ───────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <header className="flex h-14 items-center gap-3 border-b border-dark-border bg-dark-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-dark-card hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-bold text-white">DaralIraq</p>
        </header>

        <main className="flex-1 overflow-y-auto bg-dark-bg">
          {children}
        </main>

        <footer className="shrink-0 border-t border-dark-border bg-dark-surface px-4 py-2 text-center text-xs text-[#475569]">
          © {new Date().getFullYear()} All rights reserved · Created by{' '}
          <span className="font-semibold text-primary">Renas Talabani</span>
        </footer>
      </div>
    </div>
  );
}
