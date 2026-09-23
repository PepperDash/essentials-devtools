import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { websocketMiddleware } from "./websocketMiddleware";
import websocketReducer, { WS_CONNECT, WS_DISCONNECT } from "./websocketSlice";

// Minimal stand-in for the browser WebSocket; tests drive its events directly
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  // Real sockets fire error (if still connecting) and close events after close()
  close() {
    this.closed = true;
    this.onerror?.(new Event("error"));
    this.onclose?.();
  }

  receive(msg: object) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

const makeStore = () =>
  configureStore({
    reducer: combineReducers({ websocket: websocketReducer }),
    middleware: (getDefault) => getDefault().concat(websocketMiddleware),
  });

const connect = (store: ReturnType<typeof makeStore>) =>
  store.dispatch({
    type: WS_CONNECT,
    payload: { url: "ws://primary", fallbackUrl: "ws://fallback" },
  });

const openSockets = () => FakeWebSocket.instances.filter((s) => !s.closed);

describe("websocketMiddleware", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps a single live socket when connect is dispatched twice", () => {
    const store = makeStore();
    connect(store);
    connect(store);

    expect(openSockets()).toHaveLength(1);

    openSockets()[0].onopen?.();
    openSockets()[0].receive({ RenderedMessage: "hello" });

    expect(store.getState().websocket.isConnected).toBe(true);
    expect(store.getState().websocket.messages).toHaveLength(1);
  });

  it("closes the live socket on disconnect", () => {
    const store = makeStore();
    connect(store);
    connect(store);
    openSockets()[0].onopen?.();

    store.dispatch({ type: WS_DISCONNECT });

    expect(openSockets()).toHaveLength(0);
    expect(store.getState().websocket.isConnected).toBe(false);
  });

  it("falls back to the secondary URL when the primary errors", () => {
    const store = makeStore();
    connect(store);

    FakeWebSocket.instances[0].onerror?.(new Event("error"));

    expect(openSockets().map((s) => s.url)).toEqual(["ws://fallback"]);
  });
});
