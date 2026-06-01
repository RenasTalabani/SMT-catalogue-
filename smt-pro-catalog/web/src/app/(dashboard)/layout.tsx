'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import { useSocketConnect } from '@/hooks/useSocket';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router    = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSocketConnect();
  useRealtimeNotifications();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

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
      </div>
    </div>
  );
}
