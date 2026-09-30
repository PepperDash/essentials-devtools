import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routingFeedbackMiddleware } from './routingFeedbackMiddleware';
import routingFeedbackReducer, {
  ROUTING_WS_CONNECT,
} from './routingFeedbackSlice';

// Minimal stand-in for the browser WebSocket; tests drive its events directly
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  /** URLs the constructor rejects synchronously, as a browser does for a malformed URL. */
  static invalidUrls = new Set<string>();
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    if (FakeWebSocket.invalidUrls.has(url)) {
      throw new SyntaxError(`Invalid URL: ${url}`);
    }
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

const makeStore = () =>
  configureStore({
    reducer: combineReducers({ routingFeedback: routingFeedbackReducer }),
    middleware: (getDefault) => getDefault().concat(routingFeedbackMiddleware),
  });

const connect = (
  store: ReturnType<typeof makeStore>,
  url: string,
  fallbackUrl?: string
) =>
  store.dispatch({ type: ROUTING_WS_CONNECT, payload: { url, fallbackUrl } });

describe('routingFeedbackMiddleware', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    FakeWebSocket.invalidUrls = new Set();
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ignores callbacks queued for a replaced socket', () => {
    const store = makeStore();
    connect(store, 'ws://old');
    // Capture the first socket's handlers before the reconnect detaches them,
    // as if their events were already queued
    const stale = FakeWebSocket.instances[0];
    const { onclose, onerror, onmessage } = stale;

    connect(store, 'ws://new');
    const live = FakeWebSocket.instances[1];
    live.onopen?.();

    onmessage?.call(stale, {
      data: JSON.stringify({ type: 'midpointRouteChanged', deviceKey: 'x' }),
    });
    onerror?.call(stale, new Event('error'));
    onclose?.call(stale);
    vi.runAllTimers();

    expect(store.getState().routingFeedback.connected).toBe(true);
    expect(store.getState().routingFeedback.midpointRoutes).toEqual({});
    // No reconnect was scheduled, so no third socket
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(live.closed).toBe(false);
  });

  it('does not let the failed primary tear down its fallback', () => {
    const store = makeStore();
    connect(store, 'ws://primary', 'ws://fallback');
    const primary = FakeWebSocket.instances[0];
    const { onclose } = primary;

    primary.onerror?.(new Event('error'));
    const fallback = FakeWebSocket.instances[1];
    expect(fallback.url).toBe('ws://fallback');
    fallback.onopen?.();

    // A real socket fires close after error; this one is already queued
    onclose?.call(primary);
    vi.runAllTimers();

    expect(store.getState().routingFeedback.connected).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('reports the disconnect when an open socket errors over to the fallback', () => {
    const store = makeStore();
    connect(store, 'ws://primary', 'ws://fallback');
    const primary = FakeWebSocket.instances[0];
    primary.onopen?.();
    expect(store.getState().routingFeedback.connected).toBe(true);

    primary.onerror?.(new Event('error'));

    // Fallback is still connecting, so the badge must not read Live
    expect(FakeWebSocket.instances[1].url).toBe('ws://fallback');
    expect(store.getState().routingFeedback.connected).toBe(false);

    FakeWebSocket.instances[1].onopen?.();
    expect(store.getState().routingFeedback.connected).toBe(true);
  });

  it('falls back when the primary URL is malformed', () => {
    FakeWebSocket.invalidUrls.add('not a url');
    const store = makeStore();

    expect(() => connect(store, 'not a url', 'ws://fallback')).not.toThrow();

    expect(FakeWebSocket.instances.map((ws) => ws.url)).toEqual([
      'ws://fallback',
    ]);
    FakeWebSocket.instances[0].onopen?.();
    expect(store.getState().routingFeedback.connected).toBe(true);
  });

  it('reports the failure when a malformed URL has no fallback', () => {
    FakeWebSocket.invalidUrls.add('not a url');
    const store = makeStore();

    expect(() => connect(store, 'not a url')).not.toThrow();

    const state = store.getState().routingFeedback;
    expect(state.connected).toBe(false);
    expect(state.failedUrls).toEqual(['not a url']);
  });

  it('still tries the fallback when reconnecting after the primary drops', () => {
    const store = makeStore();
    connect(store, 'ws://primary', 'ws://fallback');
    const first = FakeWebSocket.instances[0];
    first.onopen?.();
    first.onclose?.();

    vi.advanceTimersByTime(3000);

    // The reconnect starts from the primary again...
    const retry = FakeWebSocket.instances[1];
    expect(retry.url).toBe('ws://primary');

    // ...and when the primary is now unavailable, moves on to the fallback.
    retry.onerror?.(new Event('error'));
    expect(FakeWebSocket.instances[2].url).toBe('ws://fallback');
    FakeWebSocket.instances[2].onopen?.();
    expect(store.getState().routingFeedback.connected).toBe(true);
  });
});
