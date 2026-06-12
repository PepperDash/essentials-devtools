import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LogMessage } from "../shared/types/LogMessage";

interface WebsocketState {
  messages: LogMessage[];
  isConnected: boolean;
  failedUrls: string[] | null;
}

const initialState: WebsocketState = {
  messages: [],
  isConnected: false,
  failedUrls: null,
};

const websocketSlice = createSlice({
  name: "websocket",
  initialState,
  reducers: {
    /** Dispatched by the middleware when the socket opens */
    connected(state) {
      state.isConnected = true;
    },
    /** Dispatched by the middleware when the socket closes */
    disconnected(state) {
      state.isConnected = false;
    },
    /** Dispatched by the middleware for each incoming message */
    messageReceived(state, action: PayloadAction<LogMessage>) {
      state.messages.push(action.payload);
    },
    /** Dispatched by the UI to clear the message log */
    messagesCleared(state) {
      state.messages = [];
    },
    /** Dispatched by the middleware when a connection attempt fails */
    connectionFailed(state, action: PayloadAction<string[]>) {
      state.failedUrls = action.payload;
    },
    /** Dispatched by the middleware when a new connection attempt starts */
    connectionAttemptStarted(state) {
      state.failedUrls = null;
    },
  },
});

export const { connected, disconnected, messageReceived, messagesCleared, connectionFailed, connectionAttemptStarted } =
  websocketSlice.actions;

export default websocketSlice.reducer;

// ── Action type constants used by the middleware ─────────────────────────────
/** Dispatch this to open a WebSocket connection */
export const WS_CONNECT = "websocket/connect";
/** Dispatch this to close the current connection */
export const WS_DISCONNECT = "websocket/disconnect";

export interface WsConnectAction {
  type: typeof WS_CONNECT;
  payload: { url: string; fallbackUrl?: string };
}

export interface WsDisconnectAction {
  type: typeof WS_DISCONNECT;
}
