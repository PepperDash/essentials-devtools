import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  MidpointRoute,
  MidpointRouteChangedMessage,
  RoutingSnapshotMessage,
  SinkInputChangedMessage,
  SinkRoute,
} from "./apiSlice";

export interface RoutingFeedbackState {
  midpointRoutes: Record<string, MidpointRoute[]>;
  sinkRoutes: Record<string, SinkRoute>;
  connected: boolean;
  failedUrl: string | null;
}

const initialState: RoutingFeedbackState = {
  midpointRoutes: {},
  sinkRoutes: {},
  connected: false,
  failedUrl: null,
};

const routingFeedbackSlice = createSlice({
  name: "routingFeedback",
  initialState,
  reducers: {
    routingWsConnected(state) {
      state.connected = true;
      state.failedUrl = null;
    },
    routingWsDisconnected(state) {
      state.connected = false;
    },
    routingWsConnectionFailed(state, action: PayloadAction<string>) {
      state.failedUrl = action.payload;
    },
    routingSnapshotReceived(
      state,
      action: PayloadAction<RoutingSnapshotMessage>,
    ) {
      state.midpointRoutes = action.payload.midpointRoutes;
      state.sinkRoutes = action.payload.sinkRoutes;
    },
    midpointRouteChanged(
      state,
      action: PayloadAction<MidpointRouteChangedMessage>,
    ) {
      state.midpointRoutes[action.payload.deviceKey] = action.payload.routes;
    },
    sinkInputChanged(state, action: PayloadAction<SinkInputChangedMessage>) {
      state.sinkRoutes[action.payload.deviceKey] = {
        inputPortKey: action.payload.inputPortKey,
        sourceDeviceKey: action.payload.sourceDeviceKey,
        signalType: action.payload.signalType,
      };
    },
    routingFeedbackReset() {
      return initialState;
    },
  },
});

export const {
  routingWsConnected,
  routingWsDisconnected,
  routingWsConnectionFailed,
  routingSnapshotReceived,
  midpointRouteChanged,
  sinkInputChanged,
  routingFeedbackReset,
} = routingFeedbackSlice.actions;

export default routingFeedbackSlice.reducer;

// ── Action type constants used by the middleware ─────────────────────────────
export const ROUTING_WS_CONNECT = "routingFeedback/wsConnect";
export const ROUTING_WS_DISCONNECT = "routingFeedback/wsDisconnect";

export interface RoutingWsConnectAction {
  type: typeof ROUTING_WS_CONNECT;
  payload: { url: string; fallbackUrl?: string };
}

export interface RoutingWsDisconnectAction {
  type: typeof ROUTING_WS_DISCONNECT;
}
