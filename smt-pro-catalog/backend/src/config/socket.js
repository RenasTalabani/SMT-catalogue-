let _io = null;

const init = (httpServer) => {
  const { Server } = require('socket.io');
  _io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  _io.on('connection', (socket) => {
    const room = socket.handshake.query.role || 'guest';
    socket.join(room);
    socket.join('all');
  });

  return _io;
};

const getIO = () => _io;

module.exports = { init, getIO };
