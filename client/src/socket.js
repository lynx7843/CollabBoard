import { io } from 'socket.io-client';

// REST calls go through a relative /api path (the Vite proxy locally, the
// Vercel rewrite in production), but a WebSocket upgrade cannot be rewritten,
// so the socket always addresses the API host directly.
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  /*
   * The server authenticates the connection with the same JWT the REST calls
   * carry, and rooms are only joined after a membership check. A WebSocket
   * handshake has no Authorization header to put it in, so it travels in the
   * handshake payload instead.
   *
   * A function rather than an object: it is read on every connection attempt,
   * so a reconnect after signing in as someone else sends the new token rather
   * than the one that existed when this module was first imported.
   */
  auth: (cb) => cb({ token: localStorage.getItem('token') || '' }),
});
