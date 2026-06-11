// ─── SocketContext.jsx ────────────────────────────────────────────────
// Provides a singleton Socket.IO connection to the entire React tree.
//
// Usage:
//   1. Wrap your app with <SocketProvider>
//   2. Call useSocket() in any child component to get the socket instance
//   3. Call connectWithToken(jwt) right after a successful login so the
//      backend can authenticate the persistent connection.
// ─────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const BACKEND_URL = 'http://localhost:5000';

// ── Context ───────────────────────────────────────────────────────────
const SocketContext = createContext(null);

// ── Custom hook ───────────────────────────────────────────────────────
/**
 * Returns the shared socket context value.
 * Must be called inside a component wrapped by <SocketProvider>.
 */
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used inside a <SocketProvider>');
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────
/**
 * Initialises a Socket.IO connection that is shared across the whole app.
 * The socket starts with autoConnect: false so it doesn't attempt to
 * handshake before we have a JWT token. Call connectWithToken(token) after
 * a successful login to authenticate and open the connection.
 */
export function SocketProvider({ children }) {
  // Internal ref keeps a stable handle for imperative use (connectWithToken etc.)
  const socketRef = useRef(null);

  // Reactive connected flag so UIs can react to connection state
  const [isConnected, setIsConnected] = useState(false);

  // ── FIX: expose socket as STATE (not a raw ref snapshot) ─────────────
  // A ref mutation does NOT trigger re-renders — every consumer would see
  // null forever.  Storing the instance in state ensures the Provider
  // re-renders once after mount, giving all children the real socket object.
  const [socketState, setSocketState] = useState(null);

  // Access auth token to reactively manage connection
  const { token } = useAuth();

  // Initialise the socket once on mount
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      autoConnect: false,       // wait for connectWithToken()
      transports: ['websocket'],
      withCredentials: true,
    });

    // ── Connection lifecycle listeners ───────────────────────────────
    socket.on('connect', () => {
      console.log('🔌  Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌  Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️  Socket connection error:', err.message);
    });

    socketRef.current = socket;
    setSocketState(socket);     // ← triggers re-render; consumers get real instance

    // ── Cleanup on unmount ────────────────────────────────────────────
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
      setSocketState(null);
      console.log('🧹  Socket cleaned up');
    };
  }, []); // run once

  /**
   * connectWithToken(token)
   * ─────────────────────────────────────────────────────────────────
   * Attaches the user's JWT to the socket auth object and opens the
   * connection. Call this immediately after a successful login/register.
   *
   * @param {string} token  — JWT returned by POST /api/auth/login
   */
  function connectWithToken(token) {
    const socket = socketRef.current;
    if (!socket) return;

    // Attach JWT so the backend can verify identity on handshake
    socket.auth = { token };

    if (socket.connected) {
      // Already open — update auth and reconnect cleanly
      socket.disconnect().connect();
    } else {
      socket.connect();
    }
  }

  /**
   * disconnectSocket()
   * ─────────────────────────────────────────────────────────────────
   * Explicitly close the socket — useful on logout so we don't keep
   * an authenticated connection alive.
   */
  function disconnectSocket() {
    socketRef.current?.disconnect();
  }

  // Reactively connect/disconnect when the token or socket state changes
  useEffect(() => {
    if (token && socketState) {
      connectWithToken(token);
    } else if (!token && socketState) {
      disconnectSocket();
    }
  }, [token, socketState]);

  const value = {
    socket: socketState,
    isConnected,
    connectWithToken,
    disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;
