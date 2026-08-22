import { io } from "socket.io-client";

// Set VITE_SOCKET_URL / REACT_APP_SOCKET_URL in your .env; falls back to same-origin.
const SOCKET_URL =
  import.meta?.env?.VITE_SOCKET_URL ||
  process.env?.REACT_APP_SOCKET_URL ||
  undefined; // undefined = connect to the page's own origin

let socket;

/**
 * Returns a single shared socket instance. Created lazily (not at import time)
 * so we don't open a connection before the user is authenticated.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // send the JWT the same way the REST API expects it, so the
      // server can authenticate the socket handshake too
      auth: (cb) => cb({ token: localStorage.getItem("token") }),
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
