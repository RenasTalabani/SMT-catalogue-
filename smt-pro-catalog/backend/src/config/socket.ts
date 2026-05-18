import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let _io: Server | null = null;

export const init = (httpServer: HttpServer): Server => {
  _io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  _io.on('connection', (socket: Socket) => {
    const room = (socket.handshake.query['role'] as string) || 'guest';
    void socket.join(room);
    void socket.join('all');
  });

  return _io;
};

export const getIO = (): Server | null => _io;
