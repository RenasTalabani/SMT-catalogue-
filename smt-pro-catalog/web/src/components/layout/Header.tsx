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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white">
          <Bell size={20} />
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
              {data!.unreadCount > 9 ? '9+' : data!.unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
