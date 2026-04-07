import { Middleware } from "@reduxjs/toolkit";
import {
  connected,
  disconnected,
  messageReceived,
  WS_CONNECT,
  WS_DISCONNECT,
  WsConnectAction,
  WsDisconnectAction,
} from "./websocketSlice";

export const websocketMiddleware: Middleware = (store) => {
  let socket: WebSocket | null = null;

  return (next) => (action) => {
    const { type } = action as WsConnectAction | WsDisconnectAction;

    if (type === WS_CONNECT) {
      const { url } = (action as WsConnectAction).payload;

      // Close any existing connection before opening a new one
      if (socket) {
        socket.close();
      }

      const initSocket = (effectiveUrl: string) => {
        socket = new WebSocket(effectiveUrl);
        socket.onopen = () => store.dispatch(connected());
        socket.onclose = () => { store.dispatch(disconnected()); socket = null; };
        socket.onerror = (err) => console.error('WebSocket error', err);
        socket.onmessage = (event: MessageEvent<string>) => {
          try {
            store.dispatch(messageReceived(JSON.parse(event.data)));
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };
      };

      if (import.meta.env.DEV) {
        // In dev: register the dynamic port with Vite's proxy plugin so it can
        // tunnel the connection, then connect via localhost (no cert issues).
        fetch('/debug/ws-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
          .then(() => {
            const parsed = new URL(url);
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            initSocket(`${proto}//${window.location.host}${parsed.pathname}${parsed.search}`);
          })
          .catch((err) => {
            console.warn('[ws] Registration failed, connecting directly:', err);
            initSocket(url);
          });
      } else {
        // In production the app is served by the device itself, so the browser
        // already trusts the device cert (TLS cert validation is per-hostname,
        // not per-port) and can connect to the high-numbered port directly.
        initSocket(url);
      }

      return;
    }

    if (type === WS_DISCONNECT) {
      if (socket) {
        socket.close();
        socket = null;
      }
      return;
    }

    return next(action);
  };
};
