'use client';
import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

export function useSocket(
  event: string,
  handler: (data: unknown) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const socket = getSocket();
    connectSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export function useSocketConnect() {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);
}
