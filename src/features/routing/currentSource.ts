/**
 * Resolving what is *actually* feeding a destination port right now.
 *
 * The obvious answer - the sink's own current-source bookkeeping in `sinkRoutes` - is only
 * written by the processor's graph-level route path (`RunRouteRequest` calls `SetCurrentSource`
 * after executing a route). Switching a midpoint directly, via
 * `IRoutingMidpointWithFeedback.ExecuteSwitch`, bypasses that entirely: the matrix reports its new
 * internal route over `RouteChanged`, but nothing tells the downstream display that what it is
 * watching just changed. `sinkRoutes` then keeps the stale value from the last full route.
 *
 * So instead of trusting that bookkeeping, walk backwards from the port over the physical tie
 * lines, using each midpoint's live `midpointRoutes` as its crossbar state, until reaching a
 * device that is not a midpoint. That is the real origin, and it updates the instant any midpoint
 * in the chain switches.
 *
 * The walk cannot always answer, so the result is explicit about which. A "cleared" verdict (a
 * midpoint reporting no route on the feeding output) is real information and must not be confused
 * with "unknown" (no tie lines to follow, or a midpoint that publishes no feedback at all) - only
 * the latter should fall back to `sinkRoutes`.
 */

import { MidpointRoute } from "../../store/apiSlice";
import { portId, RouteIndex } from "./routeGraph";

export type CurrentSourceResolution =
  /** Traced all the way to an originating device. */
  | { status: "resolved"; sourceDeviceKey: string }
  /** Traced to a midpoint that has no active route on the feeding output - nothing is getting through. */
  | { status: "cleared" }
  /** The walk ran out of information; the caller should fall back to the sink's own bookkeeping. */
  | { status: "unknown" };

/**
 * Traces backwards from a destination port to whatever is feeding it, following live midpoint
 * routes.
 */
export function resolveCurrentSource(
  index: RouteIndex,
  midpointRoutes: Record<string, MidpointRoute[]>,
  destDeviceKey: string,
  destPortKey: string,
): CurrentSourceResolution {
  const visited = new Set<string>();
  let deviceKey = destDeviceKey;
  let portKey = destPortKey;

  for (;;) {
    const id = portId(deviceKey, portKey);
    // A miswired loop must not hang the popover.
    if (visited.has(id)) return { status: "unknown" };
    visited.add(id);

    const incoming = index.byDestPort.get(id);
    // No tie line to follow - e.g. a dynamically routed system with no static wiring.
    if (!incoming || incoming.length === 0) return { status: "unknown" };

    // A physical input port is fed by one wire; if a config models more, the first is as good a
    // guess as any and the alternative is inventing a tie-break the hardware does not have.
    const { sourceDeviceKey, sourcePortKey } = incoming[0].tieLine;

    // Anything that is not a midpoint is the origin: the backend refuses to route through
    // non-midpoints too, so the chain genuinely ends here.
    if (!index.midpointKeys.has(sourceDeviceKey)) {
      return { status: "resolved", sourceDeviceKey };
    }

    const routes = midpointRoutes[sourceDeviceKey];
    // The device publishes no route feedback at all, so its crossbar state is unknowable.
    if (!routes) return { status: "unknown" };

    const active = routes.find((r) => r.outputPortKey === sourcePortKey);
    // It does publish feedback, and reports nothing on this output - a real "nothing is routed".
    if (!active) return { status: "cleared" };

    deviceKey = sourceDeviceKey;
    portKey = active.inputPortKey;
  }
}
