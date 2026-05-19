import { io, Socket } from 'socket.io-client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let _socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (_socket) return _socket;

  const token  = typeof window !== 'undefined' ? localStorage.getItem('smt_token')   : null;
  const role   = typeof window !== 'undefined' ? localStorage.getItem('smt_role')    : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('smt_user_id') : null;

  _socket = io(BASE, {
    transports:         ['websocket', 'polling'],
    query:              { role: role ?? 'guest', ...(userId ? { userId } : {}) },
    extraHeaders:       token ? { Authorization: `Bearer ${token}` } : {},
    autoConnect:        false,
    reconnection:       true,
    reconnectionDelay:  2000,
    reconnectionAttempts: 10,
  });

  return _socket;
};

export const connectSocket  = (): void => { getSocket().connect(); };
export const disconnectSocket = (): void => { _socket?.disconnect(); _socket = null; };

export const SocketEvent = {
  productCreated:  'product:created',
  productUpdated:  'product:updated',
  productDeleted:  'product:deleted',
  orderCreated:    'order:created',
  orderUpdated:    'order:updated',
  stockUpdated:    'stock:updated',
  stockLow:        'stock:low',
  notificationNew: 'notification:new',
} as const;
