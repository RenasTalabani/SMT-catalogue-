'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import { useSocketConnect } from '@/hooks/useSocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router    = useRouter();

  useSocketConnect();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-dark-bg">
        {children}
      </main>
    </div>
  );
}
