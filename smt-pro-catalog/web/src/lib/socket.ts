import { io, Socket } from 'socket.io-client';

// NEXT_PUBLIC_BACKEND_URL must be set in Railway web service env vars.
// Socket.IO cannot go through Next.js rewrites (HTTP only), so it must connect
// directly to the backend. Fallback to localhost for local dev.
const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3000';

let _socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (_socket) return _socket;

  const token  = typeof window !== 'undefined' ? localStorage.getItem('daraliraq_token')   : null;
  const role   = typeof window !== 'undefined' ? localStorage.getItem('daraliraq_role')    : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('daraliraq_user_id') : null;

  _socket = io(BASE, {
    transports:           ['websocket', 'polling'],
    // Backend reads token from handshake.auth.token
    auth:                 { token: token ?? '', role: role ?? 'guest', ...(userId ? { userId } : {}) },
    query:                { role: role ?? 'guest', ...(userId ? { userId } : {}) },
    autoConnect:          false,
    reconnection:         true,
    reconnectionDelay:    2000,
    reconnectionAttempts: 10,
  });

  return _socket;
};

export const connectSocket    = (): void => { getSocket().connect(); };
export const disconnectSocket = (): void => { _socket?.disconnect(); _socket = null; };

// Reset singleton on login/logout so new credentials are picked up
export const resetSocket = (): void => { _socket?.disconnect(); _socket = null; };

export const SocketEvent = {
  productCreated:  'product:created',
  productUpdated:  'product:updated',
  productDeleted:  'product:deleted',
  orderCreated:    'order:created',
  orderUpdated:    'order:updated',
  stockUpdated:    'stock:updated',
  stockLow:        'stock:low',
  notificationNew: 'notification:new',
  discountHigh:    'discount:high',
} as const;
