/**
 * Reads an Essentials message stream over plain HTTP instead of a WebSocket.
 *
 * Used where the WebSocket port can't be reached, such as a Virtual Control server whose firewall
 * only opens 443. The server holds each request open until a message arrives or `waitMs` passes
 * (long polling), so updates still show up almost immediately.
 *
 * Protocol (`debugSession/messages`, `routingFeedbackSession/messages`):
 * - `GET <url>` starts a session and returns `{ next, messages }`; for routing, `messages` holds the
 *   snapshot.
 * - `GET <url>?since=<next>&wait=<ms>` returns `{ next, missed, messages }` with what arrived after
 *   `since`. Each message is the same text the WebSocket would have sent.
 */

export interface PollResponse {
  next: number;
  missed?: boolean;
  messages: string[];
}

export interface MessagePollerOptions {
  /** The stream's `.../messages` URL. */
  url: string;
  /** Called with each batch, oldest first, including the first response's messages. */
  onMessages: (messages: string[]) => void;
  /** Called once the session has started, and again after each recovery from failures. */
  onConnected: () => void;
  /** Called when a request fails after the session had connected; polling keeps retrying. */
  onDisconnected?: () => void;
  /** Called when polling gives up after `maxFailures` failures in a row. */
  onFailed: (error: unknown) => void;
  /**
   * Start a new session when the server reports missed messages, rather than carrying on. Set it
   * for streams such as routing whose first response carries full state.
   */
  restartOnMissed?: boolean;
  /** How long the server may hold each request. Default 5000. */
  waitMs?: number;
  /** Pause after a response that carried messages, so a busy stream isn't fetched nonstop. Default 250. */
  minIntervalMs?: number;
  /** Pause before retrying a failed request. Default 2000. */
  retryDelayMs?: number;
  /** Failures in a row before giving up. Default 5. */
  maxFailures?: number;
  fetchImpl?: typeof fetch;
}

export interface MessagePoller {
  stop: () => void;
}

export function startMessagePoller(
  options: MessagePollerOptions
): MessagePoller {
  const {
    url,
    onMessages,
    onConnected,
    onDisconnected,
    onFailed,
    restartOnMissed = false,
    waitMs = 5000,
    minIntervalMs = 250,
    retryDelayMs = 2000,
    maxFailures = 5,
    fetchImpl = (...args) => fetch(...args),
  } = options;

  let stopped = false;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timer = null;
        resolve();
      }, ms);
    });

  const get = async (since: number | null): Promise<PollResponse> => {
    const query =
      since === null ? '' : `since=${since}&wait=${Math.max(0, waitMs)}`;
    const target = query
      ? `${url}${url.includes('?') ? '&' : '?'}${query}`
      : url;

    controller = new AbortController();
    const res = await fetchImpl(target, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PollResponse;
  };

  const run = async () => {
    let cursor: number | null = null;
    let failures = 0;
    let connected = false;

    while (!stopped) {
      try {
        const response = await get(cursor);
        if (stopped) return;

        if (cursor !== null && response.missed && restartOnMissed) {
          // Start over to get fresh full state
          cursor = null;
          continue;
        }

        cursor = response.next;
        failures = 0;

        if (!connected) {
          connected = true;
          onConnected();
        }

        if (response.messages.length > 0) {
          onMessages(response.messages);
          await delay(minIntervalMs);
        }
      } catch (err) {
        if (stopped) return;

        failures++;
        console.warn('[poll] Request failed', url, err);

        if (failures >= maxFailures) {
          stopped = true;
          onFailed(err);
          return;
        }

        // Report the outage so the UI doesn't show a live connection while retrying
        if (connected) {
          connected = false;
          onDisconnected?.();
        }
        await delay(retryDelayMs);
      }
    }
  };

  void run();

  return {
    stop: () => {
      stopped = true;
      controller?.abort();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
