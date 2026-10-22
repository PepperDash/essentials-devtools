import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MessagePollerOptions,
  PollResponse,
  startMessagePoller,
} from './messagePoller';

/**
 * A fetch stand-in that answers requests from a script, one entry per request. Once the script
 * runs out, requests stay pending until aborted, like a long poll with nothing new.
 */
function scriptedFetch(script: (PollResponse | Error | number)[]) {
  const urls: string[] = [];
  const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    const step = script.shift();

    if (step === undefined) {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      });
    }
    if (step instanceof Error) return Promise.reject(step);
    if (typeof step === 'number') {
      return Promise.resolve(new Response('', { status: step }));
    }
    return Promise.resolve(new Response(JSON.stringify(step), { status: 200 }));
  });

  return { fetchImpl: fetchImpl as unknown as typeof fetch, urls };
}

const start = (
  fetchImpl: typeof fetch,
  overrides: Partial<MessagePollerOptions> = {}
) => {
  const calls = {
    messages: [] as string[],
    connected: 0,
    disconnected: 0,
    failed: 0,
  };
  const poller = startMessagePoller({
    url: '/cws/api/debugSession/messages',
    fetchImpl,
    minIntervalMs: 0,
    retryDelayMs: 0,
    onMessages: (m) => calls.messages.push(...m),
    onConnected: () => calls.connected++,
    onDisconnected: () => calls.disconnected++,
    onFailed: () => calls.failed++,
    ...overrides,
  });
  return { poller, calls };
};

describe('startMessagePoller', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a session, then polls from the cursor it returned', async () => {
    const { fetchImpl, urls } = scriptedFetch([
      { next: 7, messages: ['snapshot'] },
      { next: 9, missed: false, messages: ['a', 'b'] },
    ]);

    const { poller, calls } = start(fetchImpl, { waitMs: 4000 });

    await vi.waitFor(() => expect(urls).toHaveLength(3));
    poller.stop();

    expect(urls).toEqual([
      '/cws/api/debugSession/messages',
      '/cws/api/debugSession/messages?since=7&wait=4000',
      '/cws/api/debugSession/messages?since=9&wait=4000',
    ]);
    expect(calls.messages).toEqual(['snapshot', 'a', 'b']);
    expect(calls.connected).toBe(1);
  });

  it('starts over after missed messages when asked to', async () => {
    const { fetchImpl, urls } = scriptedFetch([
      { next: 3, messages: ['snapshot-1'] },
      { next: 20, missed: true, messages: [] },
      { next: 20, messages: ['snapshot-2'] },
    ]);

    const { poller, calls } = start(fetchImpl, { restartOnMissed: true });

    await vi.waitFor(() => expect(urls).toHaveLength(4));
    poller.stop();

    expect(urls[2]).toBe('/cws/api/debugSession/messages');
    expect(urls[3]).toContain('since=20');
    expect(calls.messages).toEqual(['snapshot-1', 'snapshot-2']);
  });

  it('carries on past missed messages by default', async () => {
    const { fetchImpl, urls } = scriptedFetch([
      { next: 3, messages: [] },
      { next: 20, missed: true, messages: ['x'] },
    ]);

    const { poller, calls } = start(fetchImpl);

    await vi.waitFor(() => expect(urls).toHaveLength(3));
    poller.stop();

    expect(urls[2]).toContain('since=20');
    expect(calls.messages).toEqual(['x']);
  });

  it('reports an outage and recovers from the same cursor', async () => {
    const { fetchImpl, urls } = scriptedFetch([
      { next: 5, messages: [] },
      new Error('network'),
      503,
      { next: 6, messages: ['back'] },
    ]);

    const { poller, calls } = start(fetchImpl);

    await vi.waitFor(() => expect(urls).toHaveLength(5));
    poller.stop();

    expect(urls[2]).toContain('since=5');
    expect(urls[3]).toContain('since=5');
    expect(calls.disconnected).toBe(1);
    expect(calls.connected).toBe(2);
    expect(calls.messages).toEqual(['back']);
    expect(calls.failed).toBe(0);
  });

  it('gives up after too many failures in a row', async () => {
    const { fetchImpl, urls } = scriptedFetch([500, 500, 500]);

    const { calls } = start(fetchImpl, { maxFailures: 3 });

    await vi.waitFor(() => expect(calls.failed).toBe(1));
    await new Promise((r) => setTimeout(r, 20));

    expect(urls).toHaveLength(3);
    expect(calls.connected).toBe(0);
  });

  it('aborts the waiting request on stop and reports nothing after', async () => {
    const { fetchImpl, urls } = scriptedFetch([{ next: 1, messages: [] }]);

    const { poller, calls } = start(fetchImpl);

    await vi.waitFor(() => expect(urls).toHaveLength(2));
    poller.stop();
    await new Promise((r) => setTimeout(r, 20));

    expect(urls).toHaveLength(2);
    expect(calls.failed).toBe(0);
    expect(calls.disconnected).toBe(0);
  });
});
