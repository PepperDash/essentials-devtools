import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    LayoutChangedMessage,
    MidpointRoute,
    MidpointRouteChangedMessage,
    MultiviewLayoutState,
    RoutingSnapshotMessage,
    SinkInputChangedMessage,
    SinkRoute,
} from "./apiSlice";

export interface RoutingFeedbackState {
  midpointRoutes: Record<string, MidpointRoute[]>;
  // A device implementing IRoutingSinkWithLayouts (e.g. a multiview decoder) can have multiple
  // simultaneous tile routes under its one device key, so this is a list per device.
  sinkRoutes: Record<string, SinkRoute[]>;
  // Current multiview canvas/tile layout for every device implementing
  // IRoutingSinkWithLayoutState, keyed by device key.
  layouts: Record<string, MultiviewLayoutState>;
  connected: boolean;
  failedUrls: string[];
}

const initialState: RoutingFeedbackState = {
  midpointRoutes: {},
  sinkRoutes: {},
  layouts: {},
  connected: false,
  failedUrls: [],
};

const routingFeedbackSlice = createSlice({
  name: "routingFeedback",
  initialState,
  reducers: {
    routingWsConnected(state) {
      state.connected = true;
      state.failedUrls = [];
    },
    routingWsDisconnected(state) {
      state.connected = false;
    },
    routingWsConnectionFailed(state, action: PayloadAction<string[]>) {
      state.failedUrls = action.payload;
    },
    routingSnapshotReceived(
      state,
      action: PayloadAction<RoutingSnapshotMessage>,
    ) {
      state.midpointRoutes = action.payload.midpointRoutes;
      state.sinkRoutes = action.payload.sinkRoutes;
      state.layouts = action.payload.layouts ?? {};
    },
    midpointRouteChanged(
      state,
      action: PayloadAction<MidpointRouteChangedMessage>,
    ) {
      state.midpointRoutes[action.payload.deviceKey] = action.payload.routes;
    },
    sinkInputChanged(state, action: PayloadAction<SinkInputChangedMessage>) {
      const { deviceKey, inputPortKey, sourceDeviceKey, signalType } =
        action.payload;
      const existing = state.sinkRoutes[deviceKey] ?? [];
      const updated: SinkRoute = { inputPortKey, sourceDeviceKey, signalType };
      const idx = existing.findIndex((r) => r.inputPortKey === inputPortKey);
      if (idx >= 0) {
        existing[idx] = updated;
      } else {
        existing.push(updated);
      }
      state.sinkRoutes[deviceKey] = existing;
    },
    layoutChanged(state, action: PayloadAction<LayoutChangedMessage>) {
      state.layouts[action.payload.deviceKey] = action.payload.layout;
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
  layoutChanged,
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
