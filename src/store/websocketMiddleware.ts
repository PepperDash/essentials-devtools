import { Middleware } from "@reduxjs/toolkit";
import {
  connected,
  connectionAttemptStarted,
  connectionFailed,
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

      console.log("[ws] Connecting to", url);

      store.dispatch(connectionAttemptStarted());

      // Close any existing connection before opening a new one
      if (socket) {
        socket.close();
      }

      socket = new WebSocket(url);
      socket.onopen = () => store.dispatch(connected());
      socket.onclose = () => {
        store.dispatch(disconnected());
        socket = null;
      };
      socket.onerror = (err) => {
        console.error("WebSocket error", err);
        store.dispatch(connectionFailed(url));
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          store.dispatch(messageReceived(JSON.parse(event.data)));
        } catch (e) {
          console.error("Failed to parse WebSocket message", e);
        }
      };

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
