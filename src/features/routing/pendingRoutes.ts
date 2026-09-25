/**
 * Tracking for routing commands the processor has accepted but not yet confirmed.
 *
 * `sinkRoute` and `clearSink` return 202: the processor validates them synchronously, then runs
 * them through a serialized routing queue, and a destination that is warming or cooling can hold
 * its request until the cooldown finishes. So the authoritative result arrives over the feedback
 * WebSocket rather than in the HTTP response, and the affected port shows a pending marker until
 * the expected feedback lands - or until it plainly never will.
 */

import { MidpointRoute, SinkRoute } from "../../store/apiSlice";
import { RoutingCommand } from "../../store/routingCommands";

export interface PendingRoute {
  deviceKey: string;
  portKey: string;
  kind: "sinkInput" | "midpointOutput";
  /** Null for a clear, where the expectation is the ABSENCE of a route. */
  expectedSourceDeviceKey: string | null;
  expectedInputPortKey: string | null;
  startedAt: number;
  timedOut?: boolean;
}

/** How long to wait for feedback before warning that a route may not have been made. */
export const PENDING_TIMEOUT_MS = 10_000;
/** How long the warning stays on the port before clearing itself. */
export const PENDING_CLEANUP_MS = 5_000;

/** NUL cannot appear in a device or port key, so it cannot collide with key content. */
export function pendingId(deviceKey: string, portKey: string): string {
  return `${deviceKey}\u0000${portKey}`;
}

/**
 * Derives what to watch for from the command that was sent, or null when the command names no
 * port to attach a marker to (a `clearSink` with no input port clears whatever the sink has).
 */
export function pendingFromCommand(command: RoutingCommand, now: number): PendingRoute | null {
  const isMidpoint =
    command.command === "midpointSwitch" || command.command === "clearMidpointOutput";
  const portKey = isMidpoint ? command.outputPortKey : command.inputPortKey;
  if (!portKey) return null;

  return {
    deviceKey: command.deviceKey,
    portKey,
    kind: isMidpoint ? "midpointOutput" : "sinkInput",
    expectedSourceDeviceKey: command.command === "sinkRoute" ? command.sourceDeviceKey : null,
    expectedInputPortKey: command.command === "midpointSwitch" ? command.inputPortKey : null,
    startedAt: now,
  };
}

/**
 * Has sink feedback caught up with what was asked for? A route expects the port to report the
 * requested source; a clear expects no route at all, since the feedback slice removes cleared
 * entries rather than storing a sourceless one.
 */
export function isSinkExpectationMet(
  sinkRoutes: Record<string, SinkRoute[]>,
  pending: PendingRoute,
): boolean {
  const route = (sinkRoutes[pending.deviceKey] ?? []).find(
    (r) => r.inputPortKey === pending.portKey,
  );
  if (pending.expectedSourceDeviceKey === null) return route === undefined;
  return route?.sourceDeviceKey === pending.expectedSourceDeviceKey;
}

/** The same for a midpoint output: the requested input, or no route on that output for a clear. */
export function isMidpointExpectationMet(
  midpointRoutes: Record<string, MidpointRoute[]>,
  pending: PendingRoute,
): boolean {
  const route = (midpointRoutes[pending.deviceKey] ?? []).find(
    (r) => r.outputPortKey === pending.portKey,
  );
  if (pending.expectedInputPortKey === null) return route === undefined;
  return route?.inputPortKey === pending.expectedInputPortKey;
}

/** True when live feedback shows the command landed. */
export function isExpectationMet(
  sinkRoutes: Record<string, SinkRoute[]>,
  midpointRoutes: Record<string, MidpointRoute[]>,
  pending: PendingRoute,
): boolean {
  return pending.kind === "sinkInput"
    ? isSinkExpectationMet(sinkRoutes, pending)
    : isMidpointExpectationMet(midpointRoutes, pending);
}

/**
 * Ages out markers the processor never confirmed: flags them past the timeout, then drops them.
 * Returns the same object when nothing changed, so callers can bail out of a state update.
 */
export function agePendingRoutes(
  pending: Record<string, PendingRoute>,
  now: number,
): Record<string, PendingRoute> {
  const next: Record<string, PendingRoute> = {};
  let changed = false;

  for (const [id, entry] of Object.entries(pending)) {
    const age = now - entry.startedAt;
    if (age > PENDING_TIMEOUT_MS + PENDING_CLEANUP_MS) {
      changed = true;
      continue;
    }
    if (age > PENDING_TIMEOUT_MS && !entry.timedOut) {
      next[id] = { ...entry, timedOut: true };
      changed = true;
    } else {
      next[id] = entry;
    }
  }

  return changed ? next : pending;
}
