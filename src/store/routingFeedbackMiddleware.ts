import { Middleware } from "@reduxjs/toolkit";
import { RoutingFeedbackMessage } from "./apiSlice";
import {
    layoutChanged,
    midpointRouteChanged,
    ROUTING_WS_CONNECT,
    ROUTING_WS_DISCONNECT,
    routingFeedbackReset,
    routingSnapshotReceived,
    RoutingWsConnectAction,
    routingWsConnected,
    routingWsConnectionFailed,
    RoutingWsDisconnectAction,
    routingWsDisconnected,
    sinkInputChanged,
} from "./routingFeedbackSlice";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const routingFeedbackMiddleware: Middleware = (store) => {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let currentUrl: string | null = null;
  let fallbackUrl: string | null = null;
  let attemptedUrls: string[] = [];

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      socket = null;
    }
    reconnectAttempts = 0;
    currentUrl = null;
    fallbackUrl = null;
    attemptedUrls = [];
  }

  function connectToUrl(url: string, fallback?: string) {
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      socket = null;
    }

    currentUrl = url;
    if (!attemptedUrls.includes(url)) attemptedUrls.push(url);
    socket = new WebSocket(url);

    socket.onopen = () => {
      reconnectAttempts = 0;
      attemptedUrls = [];
      store.dispatch(routingWsConnected());
    };

    socket.onclose = () => {
      store.dispatch(routingWsDisconnected());
      socket = null;
      attemptReconnect();
    };

    socket.onerror = (err) => {
      console.error("[routing-ws] WebSocket error", err);
      if (fallback) {
        console.log("[routing-ws] Primary connection failed, falling back to", fallback);
        connectToUrl(fallback);
      }
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as RoutingFeedbackMessage;
        switch (msg.type) {
          case "snapshot":
            store.dispatch(routingSnapshotReceived(msg));
            break;
          case "midpointRouteChanged":
            store.dispatch(midpointRouteChanged(msg));
            break;
          case "sinkInputChanged":
            store.dispatch(sinkInputChanged(msg));
            break;
          case "layoutChanged":
            store.dispatch(layoutChanged(msg));
            break;
        }
      } catch (e) {
        console.error("[routing-ws] Failed to parse message", e);
      }
    };
  }

  function attemptReconnect() {
    if (!currentUrl) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      store.dispatch(routingWsConnectionFailed([...attemptedUrls]));
      return;
    }
    reconnectAttempts++;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = setTimeout(() => {
      if (currentUrl) connectToUrl(currentUrl);
    }, RECONNECT_DELAY_MS);
  }

  return (next) => (action) => {
    const { type } = action as RoutingWsConnectAction | RoutingWsDisconnectAction;

    if (type === ROUTING_WS_CONNECT) {
      const { url, fallbackUrl: fb } = (action as RoutingWsConnectAction).payload;
      cleanup();
      fallbackUrl = fb ?? null;
      connectToUrl(url, fallbackUrl ?? undefined);
      return;
    }

    if (type === ROUTING_WS_DISCONNECT) {
      cleanup();
      store.dispatch(routingWsDisconnected());
      store.dispatch(routingFeedbackReset());
      return;
    }

    return next(action);
  };
};
