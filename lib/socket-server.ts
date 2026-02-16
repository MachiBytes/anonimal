import { Server as SocketIOServer } from 'socket.io';

/**
 * Get the Socket.io server instance
 * This is set globally by the custom server (server.js)
 */
export function getIO(): SocketIOServer {
  if (typeof global.io === 'undefined') {
    throw new Error('Socket.io server not initialized');
  }
  return global.io as SocketIOServer;
}

/**
 * Check if Socket.io server is initialized
 */
export function isIOInitialized(): boolean {
  return typeof global.io !== 'undefined';
}
