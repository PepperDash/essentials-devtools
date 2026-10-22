import { Middleware } from '@reduxjs/toolkit';
import { MessagePoller, startMessagePoller } from './messagePoller';
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
  let poller: MessagePoller | null = null;

  const dispatchMessages = (messages: string[]) => {
    for (const data of messages) {
      try {
        store.dispatch(messageReceived(JSON.parse(data)));
      } catch (e) {
        console.error('Failed to parse debug message', e);
      }
    }
  };

  // Detach handlers before closing so a stale socket can't clobber the
  // current one, trigger a fallback connection, or keep dispatching messages
  const closeSocket = () => {
    if (poller) {
      poller.stop();
      poller = null;
    }
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
      const payload = (action as WsConnectAction).payload;

      // Close any existing connection before opening a new one. Its handlers
      // are detached, so report the disconnect here before the new attempt
      closeSocket();
      store.dispatch(disconnected());
      store.dispatch(connectionAttemptStarted());

      if ('pollUrl' in payload) {
        console.log('[ws] Polling', payload.pollUrl);

        // Every callback checks it still owns `poller`, as the socket handlers do
        const current: MessagePoller = startMessagePoller({
          url: payload.pollUrl,
          onConnected: () => {
            if (poller === current) store.dispatch(connected());
          },
          onDisconnected: () => {
            if (poller !== current) return;
            store.dispatch(disconnected());
            store.dispatch(connectionAttemptStarted());
          },
          onFailed: (err) => {
            if (poller !== current) return;
            console.error('[ws] Polling the debug log failed', err);
            poller = null;
            store.dispatch(disconnected());
          },
          onMessages: (messages) => {
            if (poller === current) dispatchMessages(messages);
          },
        });
        poller = current;
        return;
      }

      const { url, fallbackUrl } = payload;

      console.log('[ws] Connecting to', url);

      const connectToUrl = (targetUrl: string, fallback?: string) => {
        let ws: WebSocket;
        try {
          ws = new WebSocket(targetUrl);
        } catch (err) {
          // An unparseable URL throws synchronously instead of firing onerror
          console.error('[ws] Invalid WebSocket URL', targetUrl, err);
          if (fallback) {
            connectToUrl(fallback);
          } else {
            store.dispatch(
              connectionFailed(
                fallbackUrl && targetUrl === fallbackUrl
                  ? [url, fallbackUrl]
                  : [targetUrl]
              )
            );
          }
          return;
        }
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
            // An already-open primary can error too. Report a fresh attempt rather than
            // leaving the UI showing a live connection while the fallback handshakes
            store.dispatch(disconnected());
            store.dispatch(connectionAttemptStarted());
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
          dispatchMessages([event.data]);
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
