import { Middleware } from '@reduxjs/toolkit';
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
} from './websocketSlice';

export const websocketMiddleware: Middleware = (store) => {
  let socket: WebSocket | null = null;

  // Detach handlers before closing so a stale socket can't clobber the
  // current one, trigger a fallback connection, or keep dispatching messages
  const closeSocket = () => {
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      socket = null;
    }
  };

  return (next) => (action) => {
    const { type } = action as WsConnectAction | WsDisconnectAction;

    if (type === WS_CONNECT) {
      const { url, fallbackUrl } = (action as WsConnectAction).payload;

      console.log('[ws] Connecting to', url);

      store.dispatch(connectionAttemptStarted());

      // Close any existing connection before opening a new one
      closeSocket();

      const connectToUrl = (targetUrl: string, fallback?: string) => {
        const ws = new WebSocket(targetUrl);
        socket = ws;
        ws.onopen = () => {
          if (socket !== ws) return;
          store.dispatch(connected());
        };
        ws.onclose = () => {
          if (socket !== ws) return;
          store.dispatch(disconnected());
          socket = null;
        };
        ws.onerror = (err) => {
          if (socket !== ws) return;
          console.error('WebSocket error', err);
          if (fallback) {
            console.log(
              '[ws] Primary connection failed, falling back to',
              fallback
            );
            closeSocket();
            connectToUrl(fallback);
          } else {
            // Report all attempted URLs (primary + fallback that was tried)
            const attemptedUrls =
              fallbackUrl && targetUrl === fallbackUrl
                ? [url, fallbackUrl]
                : [targetUrl];
            store.dispatch(connectionFailed(attemptedUrls));
          }
        };
        ws.onmessage = (event: MessageEvent<string>) => {
          if (socket !== ws) return;
          try {
            store.dispatch(messageReceived(JSON.parse(event.data)));
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };
      };

      connectToUrl(url, fallbackUrl);

      return;
    }

    if (type === WS_DISCONNECT) {
      closeSocket();
      store.dispatch(disconnected());
      return;
    }

    return next(action);
  };
};
