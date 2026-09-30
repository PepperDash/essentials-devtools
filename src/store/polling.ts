/**
 * How often each page re-reads data that can change on the processor while it is displayed.
 *
 * Faster where the value is live status, slower where it only changes through an occasional
 * action, and slowest for the config, which is large and only changes when a config is loaded.
 */
export const POLL_INTERVALS_MS = {
  /** Device properties and feedbacks: live device state. */
  deviceValues: 2_000,
  /** Mobile Control connection status and clients. */
  mobileControlInfo: 5_000,
  /** The secrets list: changed by other users and other subsystems (e.g. pairing tokens). */
  secrets: 15_000,
  /** The running config: large, and only changes when a config is loaded. */
  config: 30_000,
} as const;

/**
 * Query options for data shown live: fetch fresh whenever the page mounts rather than showing
 * whatever was cached from an earlier visit, then poll while the browser tab is in the foreground.
 * RTK Query shares structure between results, so a poll that returns the same data doesn't
 * re-render anything.
 */
export function livePolling(intervalMs: number) {
  return {
    pollingInterval: intervalMs,
    skipPollingIfUnfocused: true,
    refetchOnMountOrArgChange: true,
  } as const;
}
