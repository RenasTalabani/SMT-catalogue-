import { Server, Socket } from 'socket.io';
import { getIO } from '../../config/socket';

const ROOMS = { ALL: 'all', ADMIN: 'admin', STAFF: 'staff' } as const;

export const broadcastProductCreated  = (product: unknown): void => { getIO()?.to(ROOMS.ALL).emit('product:created',  product); };
export const broadcastProductUpdated  = (product: unknown): void => { getIO()?.to(ROOMS.ALL).emit('product:updated',  product); };
export const broadcastProductDeleted  = (id: number):       void => { getIO()?.to(ROOMS.ALL).emit('product:deleted',  { id });  };
export const broadcastOrderCreated    = (order: unknown):   void => { getIO()?.to(ROOMS.ALL).emit('order:created',    order);   };
export const broadcastOrderUpdated    = (id: number, status: string): void => { getIO()?.to(ROOMS.ALL).emit('order:updated', { id, status }); };
export const broadcastStockUpdated    = (productId: number, qty: number): void => { getIO()?.to(ROOMS.ALL).emit('stock:updated', { productId, newQty: qty }); };
export const broadcastLowStock        = (product: unknown): void => { getIO()?.to(ROOMS.ADMIN).emit('stock:low', product); };

export const initSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    const role = (socket.handshake.auth as Record<string, string>)?.['role'];

    void socket.join(ROOMS.ALL);
    if (role === 'admin' || role === 'employee') void socket.join(ROOMS.STAFF);
    if (role === 'admin')                        void socket.join(ROOMS.ADMIN);

    socket.on('disconnect', () => {});
  });
};
