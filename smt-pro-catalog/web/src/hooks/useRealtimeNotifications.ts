'use client';
import { useSocket } from './useSocket';
import { SocketEvent } from '@/lib/socket';
import toast from 'react-hot-toast';

export function useRealtimeNotifications() {
  useSocket(SocketEvent.orderCreated, (data: unknown) => {
    const order = data as { id?: number };
    toast.success(`New order #${order?.id ?? ''}`, {
      icon: '🛒',
      duration: 4000,
    });
  });

  useSocket(SocketEvent.orderUpdated, (data: unknown) => {
    const order = data as { id?: number; status?: string };
    if (order?.status === 'COMPLETED') {
      toast.success(`Order #${order?.id ?? ''} completed`, { icon: '✅', duration: 3000 });
    } else if (order?.status === 'CANCELLED') {
      toast.error(`Order #${order?.id ?? ''} cancelled`, { duration: 3000 });
    }
  });

  useSocket(SocketEvent.stockLow, (data: unknown) => {
    const product = data as { name?: string; quantity?: number };
    toast(`Low stock: ${product?.name ?? 'Product'} (${product?.quantity ?? 0} left)`, {
      icon: '⚠️',
      duration: 6000,
      style: { background: '#1A1A2E', color: '#F59E0B', border: '1px solid #F59E0B44' },
    });
  });

  useSocket(SocketEvent.notificationNew, (data: unknown) => {
    const n = data as { message?: string };
    if (n?.message) {
      toast(n.message, { icon: '🔔', duration: 5000 });
    }
  });

  useSocket(SocketEvent.discountHigh, (data: unknown) => {
    const d = data as { orderId?: number; discountPct?: number };
    toast(`High discount alert: Order #${d?.orderId ?? ''} — ${d?.discountPct ?? 0}% off`, {
      icon: '🚨',
      duration: 8000,
      style: { background: '#1A1A2E', color: '#F87171', border: '1px solid #F8717144' },
    });
  });
}
