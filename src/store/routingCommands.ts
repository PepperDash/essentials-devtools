/**
 * The wire contract for `POST /cws/{appId}/api/routingCommand`.
 *
 * Everything the backend contract touches lives in this one file, so a shape change on the C#
 * side (RoutingCommandRequestHandler / RoutingCommandExecutor in PepperDash.Essentials.Core/Web)
 * is a single-file edit here rather than a hunt through components.
 *
 * Ports are addressed by KEY, never by selector: `RoutingPort.Selector` is a driver-defined
 * `object` that cannot cross JSON, so the server resolves key -> RoutingPort -> Selector itself.
 */

/** Path segment appended after `/{appId}/api/`. Also probed to detect endpoint support. */
export const ROUTING_COMMAND_PATH = 'routingCommand';

/**
 * Route a source device to a sink input, switching every midpoint along the discovered path and
 * the sink's own input. `inputPortKey` may be multiview-qualified ("tile2:tileInput"); the server
 * de-qualifies it back to the child tile sink.
 *
 * `sourcePortKey` is intentionally unset by this app: with no source port the backend's
 * `GetRouteToSource` picks one, and the UI has no basis for choosing among a source's outputs.
 */
export interface SinkRouteCommand {
  command: 'sinkRoute';
  deviceKey: string;
  inputPortKey?: string;
  sourceDeviceKey: string;
  sourcePortKey?: string;
  signalType: string;
  dryRun?: boolean;
}

/** Switch a single midpoint, input to output. No upstream or downstream routing. */
export interface MidpointSwitchCommand {
  command: 'midpointSwitch';
  deviceKey: string;
  inputPortKey: string;
  outputPortKey: string;
  signalType: string;
  dryRun?: boolean;
}

/**
 * Tear down the route feeding a sink input. Omit `inputPortKey` to clear whatever the sink
 * currently has.
 *
 * `clearSinkInput` additionally deselects the sink's own input: a clear tears down the midpoints
 * in the path but never touches the destination, so without it a cleared display stays showing its
 * last input.
 */
export interface ClearSinkCommand {
  command: 'clearSink';
  deviceKey: string;
  inputPortKey?: string;
  /** Stop usage tracking but leave the signal flowing, rather than tearing the path down. */
  releaseOnly?: boolean;
  clearSinkInput?: boolean;
  dryRun?: boolean;
}

/** Clear one output port on a midpoint. */
export interface ClearMidpointOutputCommand {
  command: 'clearMidpointOutput';
  deviceKey: string;
  outputPortKey: string;
  signalType: string;
  dryRun?: boolean;
}

export type RoutingCommand =
  | SinkRouteCommand
  | MidpointSwitchCommand
  | ClearSinkCommand
  | ClearMidpointOutputCommand;

/** One switch in a discovered route path. Mirrors the read API's `RouteSwitchStepInfo`. */
export interface RoutingCommandStep {
  /** Audio or Video - an AudioVideo route is discovered as two independent paths. */
  signalType: string;
  switchingDeviceKey?: string;
  inputPortKey?: string;
  /** Absent on the final step onto a sink, which has no output port. */
  outputPortKey?: string;
}

export interface RoutingCommandError {
  code: RoutingCommandErrorCode;
  message: string;
  /** The offending request field, where one applies. */
  field?: string;
}

/**
 * Stable error codes. The status code says how to react: 404 means the key is wrong, 422 means the
 * keys exist but the request is impossible on that device, 409 means the keys are fine but the
 * system's wiring cannot satisfy it.
 */
export type RoutingCommandErrorCode =
  | 'invalidJson'
  | 'missingField'
  | 'unknownCommand'
  | 'invalidSignalType'
  | 'deviceNotFound'
  | 'deviceNotRoutable'
  | 'tileNotFound'
  | 'portNotFound'
  | 'signalTypeNotSupportedByPort'
  | 'noRouteFound'
  | 'executionError';

export interface RoutingCommandResponse {
  /**
   * "executed" - done by the time the response was written (midpoint commands run inline).
   * "accepted" - validated and enqueued on the processor's serialized routing queue; confirmation
   *   arrives over the routing feedback WebSocket, not here.
   * "validated" - dry run.
   */
  status: 'executed' | 'accepted' | 'validated' | 'error';
  command?: RoutingCommand['command'];
  deviceKey?: string;
  /** Differs from `deviceKey` only when a "tile{N}:" port was de-qualified to its child sink. */
  resolvedDeviceKey?: string;
  resolvedInputPortKey?: string;
  resolvedOutputPortKey?: string;
  signalType?: string;
  /**
   * What was actually handed to the devices. Can be WIDER than the request: a pre-mapped route
   * descriptor is built from the port's declared type, so an Audio-only request across
   * all-AudioVideo ports executes as AudioVideo rather than breaking away.
   */
  effectiveSignalType?: string;
  steps?: RoutingCommandStep[];
  /** An AudioVideo request that found a path for only one half. The found half is still routed. */
  partial?: boolean;
  error?: RoutingCommandError;
}

// ─── Builders ────────────────────────────────────────────────────────────────

export function sinkRouteCommand(
  deviceKey: string,
  inputPortKey: string,
  sourceDeviceKey: string,
  signalType: string
): SinkRouteCommand {
  return {
    command: 'sinkRoute',
    deviceKey,
    inputPortKey,
    sourceDeviceKey,
    signalType,
  };
}

export function midpointSwitchCommand(
  deviceKey: string,
  inputPortKey: string,
  outputPortKey: string,
  signalType: string
): MidpointSwitchCommand {
  return {
    command: 'midpointSwitch',
    deviceKey,
    inputPortKey,
    outputPortKey,
    signalType,
  };
}

export function clearSinkCommand(
  deviceKey: string,
  inputPortKey: string
): ClearSinkCommand {
  // Always deselect the destination's own input too - a user clearing a route expects the display
  // to stop showing the old source, not just for the path behind it to be released.
  return {
    command: 'clearSink',
    deviceKey,
    inputPortKey,
    clearSinkInput: true,
  };
}

export function clearMidpointOutputCommand(
  deviceKey: string,
  outputPortKey: string,
  signalType: string
): ClearMidpointOutputCommand {
  return {
    command: 'clearMidpointOutput',
    deviceKey,
    outputPortKey,
    signalType,
  };
}

// ─── Capability detection ────────────────────────────────────────────────────

const ROUTING_COMMAND_SEGMENT = new RegExp(
  `(^|/)${ROUTING_COMMAND_PATH}(/|$)`,
  'i'
);

/**
 * True when the processor exposes the routing command endpoint, detected from its live CWS route
 * table. Matches a whole path segment, so `/api/notRoutingCommand` doesn't read as support.
 */
export function supportsRoutingCommand(routes?: { Url?: string }[]): boolean {
  if (!routes) return false;
  return routes.some((route) => ROUTING_COMMAND_SEGMENT.test(route.Url ?? ''));
}

// ─── Error rendering ─────────────────────────────────────────────────────────

/**
 * Turns whatever RTK Query surfaced into a sentence worth showing in the popover.
 *
 * `axiosBaseQuery` maps a non-2xx response to `{ status, data }`, so the endpoint's structured
 * error body is at `error.data.error`.
 */
export function describeRoutingError(error: unknown): string {
  const data = (error as { data?: RoutingCommandResponse })?.data;
  if (data?.error?.message) return data.error.message;

  const status = (error as { status?: number | string })?.status;
  if (status === 'FETCH_ERROR' || status === undefined) {
    return 'Could not reach the processor.';
  }
  return `Routing command failed (${status}).`;
}
