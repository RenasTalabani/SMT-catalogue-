'use client';
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fetcher } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket';
import {
  X, BellOff, CheckCheck, ShoppingCart,
  AlertTriangle, FileText, Info, Package,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Notification {
  id:        number;
  title:     string;
  body:      string;
  type:      string;
  isRead:    boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  order:   <ShoppingCart size={14} className="text-blue-400" />,
  warning: <AlertTriangle size={14} className="text-yellow-400" />,
  invoice: <FileText size={14} className="text-purple-400" />,
  stock:   <Package size={14} className="text-orange-400" />,
  info:    <Info size={14} className="text-[#94A3B8]" />,
};

const TYPE_DOT: Record<string, string> = {
  order:   'bg-blue-400',
  warning: 'bg-yellow-400',
  invoice: 'bg-purple-400',
  stock:   'bg-orange-400',
  info:    'bg-[#94A3B8]',
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: Props) {
  const qc   = useQueryClient();
  const ref  = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn:  () => fetcher<{ notifications: Notification[]; unreadCount: number }>('/notifications?limit=30'),
    enabled:  open,
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount ?? 0;

  useSocket(SocketEvent.notificationNew, () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  });

  const readOneMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Panel */}
      <div
        ref={ref}
        className="fixed right-4 top-16 z-50 w-[360px] max-h-[calc(100vh-80px)] flex flex-col card rounded-2xl shadow-2xl border border-dark-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white text-sm">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button type="button" title="Mark all as read"
                onClick={() => readAllMutation.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                <CheckCheck size={13} /> All read
              </button>
            )}
            <button type="button" title="Close" onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-dark-card transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="py-10 text-center text-sm text-[#94A3B8]">Loading…</div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="py-12 text-center">
              <BellOff size={32} className="mx-auto text-[#94A3B8] mb-3 opacity-40" />
              <p className="text-sm text-[#94A3B8]">No notifications yet</p>
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) readOneMutation.mutate(n.id); }}
              className={clsx(
                'flex gap-3 px-4 py-3 border-b border-dark-border/50 cursor-pointer transition-colors',
                !n.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-dark-card/30',
              )}
            >
              {/* Icon */}
              <div className={clsx(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5',
                !n.isRead ? 'bg-primary/15' : 'bg-dark-card',
              )}>
                {TYPE_ICON[n.type] ?? <Info size={14} className="text-[#94A3B8]" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium truncate', !n.isRead ? 'text-white' : 'text-[#CBD5E1]')}>
                  {n.title}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-[#64748B] mt-1">{timeAgo(n.createdAt)}</p>
              </div>

              {/* Unread dot */}
              {!n.isRead && (
                <div className={clsx('h-2 w-2 rounded-full flex-shrink-0 mt-2', TYPE_DOT[n.type] ?? 'bg-primary')} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-dark-border flex-shrink-0 text-center">
            <p className="text-xs text-[#64748B]">
              Showing last {notifications.length} notifications
            </p>
          </div>
        )}
      </div>
    </>
  );
}
