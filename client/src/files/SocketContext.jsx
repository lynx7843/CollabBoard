import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getSocket, disconnectSocket } from "../lib/socket";

const SocketContext = createContext(null);

/**
 * Wrap the authenticated part of the app in <SocketProvider>. It opens
 * one socket connection for the session and tears it down on unmount
 * (e.g. logout), rather than every board screen managing its own connection.
 */
export function SocketProvider({ children }) {
  const socketRef = useRef(getSocket());
  const [status, setStatus] = useState("connecting"); // connecting | connected | disconnected

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => setStatus("connected");
    const handleDisconnect = () => setStatus("disconnected");
    const handleConnectError = () => setStatus("disconnected");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, status }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}
