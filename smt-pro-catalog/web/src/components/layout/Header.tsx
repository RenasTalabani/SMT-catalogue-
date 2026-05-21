'use client';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export default function Header({ title }: { title: string }) {
  const qc = useQueryClient();
  const { data } = useQuery<{ unreadCount: number }>({
    queryKey: ['notifications', 'unread'],
    queryFn:  () => fetcher('/notifications/unread'),
  });

  useSocket(SocketEvent.notificationNew, () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-dark-border bg-dark-surface px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-dark-card text-[#94A3B8] hover:bg-dark-border hover:text-white transition-colors">
          <Bell size={18} />
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] text-white font-bold">
              {data!.unreadCount > 9 ? '9+' : data!.unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
