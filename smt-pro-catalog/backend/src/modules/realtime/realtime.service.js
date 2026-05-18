const { getIO } = require('../../config/socket');

const ROOMS = {
  ALL:     'all',
  ADMIN:   'admin',
  STAFF:   'staff',
};

const broadcastProductCreated  = (product)       => getIO()?.to(ROOMS.ALL).emit('product:created',  product);
const broadcastProductUpdated  = (product)       => getIO()?.to(ROOMS.ALL).emit('product:updated',  product);
const broadcastProductDeleted  = (id)            => getIO()?.to(ROOMS.ALL).emit('product:deleted',  { id });
const broadcastOrderCreated    = (order)         => getIO()?.to(ROOMS.ALL).emit('order:created',    order);
const broadcastOrderUpdated    = (id, status)    => getIO()?.to(ROOMS.ALL).emit('order:updated',    { id, status });
const broadcastStockUpdated    = (productId, qty)=> getIO()?.to(ROOMS.ALL).emit('stock:updated',    { productId, newQty: qty });
const broadcastLowStock        = (product)       => getIO()?.to(ROOMS.ADMIN).emit('stock:low',      product);

const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const { role } = socket.handshake.auth ?? {};

    socket.join(ROOMS.ALL);
    if (role === 'admin' || role === 'employee') socket.join(ROOMS.STAFF);
    if (role === 'admin')                        socket.join(ROOMS.ADMIN);

    socket.on('disconnect', () => {});
  });
};

module.exports = {
  initSocketHandlers,
  broadcastProductCreated, broadcastProductUpdated, broadcastProductDeleted,
  broadcastOrderCreated,   broadcastOrderUpdated,
  broadcastStockUpdated,   broadcastLowStock,
};
