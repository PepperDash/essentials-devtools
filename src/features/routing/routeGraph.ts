/**
 * Client-side routing-graph traversal: "which source devices have a path to this destination
 * port for this signal type?"
 *
 * The backend answers the inverse question - `Extensions.GetRouteToSource` walks backwards from
 * one destination to one named source and returns a RouteDescriptor or nothing. Asking it once
 * per source to populate a dropdown would be O(sources x graph). Instead we run a single reverse
 * reachability sweep per signal atom, which is O(devices + tieLines) and answers for every source
 * at once.
 *
 * The traversal deliberately mirrors the backend's rules (PepperDash.Essentials.Core/Routing/
 * Extensions.cs:588-717) so the UI does not offer routes the processor would refuse:
 *
 *   - The *initial* destination is port-constrained, but every upstream hop is not. The backend
 *     recurses with `destinationPort = null` (Extensions.cs:677-678), so once we step off the
 *     destination we consider all of a device's inputs.
 *   - A tie line must carry the requested signal: `t.Type.HasFlag(signalType)` (Extensions.cs:619).
 *   - Any device on the far end of a matching tie line is a candidate, whatever its role - the
 *     backend's direct-tie check (Extensions.cs:625-641) does not filter by device type.
 *   - But we only *recurse* through midpoints: `t.SourcePort.ParentDevice is IRoutingMidpoint`
 *     (Extensions.cs:653). This is why a non-midpoint passthrough terminates the walk and hides
 *     whatever is upstream of it.
 *
 * KNOWN DIVERGENCE: the backend's `alreadyCheckedDevices` list (Extensions.cs:656-658) is shared
 * across its whole depth-first search and never unwound, and it breaks on first success. In
 * diamond topologies it can therefore FAIL to find a route that this complete sweep finds. The
 * consequence is that a source we list may occasionally fail to route - which surfaces to the user
 * as a pending-feedback timeout rather than a silent lie. Erring toward offering the route is the
 * right side to be wrong on; the alternative would hide legitimately routable sources.
 */

import { RoutingDevice, RoutingDevicesAndTieLines, TieLine } from "../../store/apiSlice";
import { atomsOf, parseSignalFlags } from "./signalTypes";

/** A tie line with its signal type pre-parsed, so traversal never re-parses strings. */
interface IndexedTieLine {
  tieLine: TieLine;
  flags: ReadonlySet<string>;
}

interface RouteIndex {
  deviceByKey: Map<string, RoutingDevice>;
  /** All tie lines arriving at a device, keyed by device key. */
  byDestDevice: Map<string, IndexedTieLine[]>;
  /** All tie lines arriving at a specific port, keyed by `portId(deviceKey, portKey)`. */
  byDestPort: Map<string, IndexedTieLine[]>;
  /** Devices we may recurse through - the literal `is IRoutingMidpoint` flag. */
  midpointKeys: Set<string>;
}

interface CandidateSource {
  deviceKey: string;
  name: string;
  /** True for a device with outputs and no inputs - listed first, since these are the usual pick. */
  isPureSource: boolean;
  /**
   * Which of the requested signal atoms actually have a path. Shorter than the request means a
   * partial match (e.g. video reaches the destination but audio does not), which the backend will
   * still route - `ReleaseAndMakeRoute` succeeds if either half of an AudioVideo request resolves.
   */
  matchedFlags: string[];
}

/** Resolves reachable upstream devices for one destination port and one signal atom. */
type ReachabilityResolver = (
  destDeviceKey: string,
  destPortKey: string | null,
  atom: string,
) => ReadonlySet<string>;

/** NUL is not legal in a device or port key, so it cannot collide with key content. */
const PORT_SEP = "\u0000";

function portId(deviceKey: string, portKey: string): string {
  return `${deviceKey}${PORT_SEP}${portKey}`;
}

// ─── Device roles ────────────────────────────────────────────────────────────
//
// `hasInputsAndOutputs` is the literal `is IRoutingMidpoint` flag and is the only reliable
// discriminator. Note a multiview decoder (IRoutingSinkWithLayouts) reports hasInputs AND
// hasOutputs while NOT being a midpoint - the read handler forces HasInputs = true so its tiles
// can be rendered as input ports. So "sink = hasInputs && !hasOutputs" would wrongly exclude
// exactly the devices whose tiles we want to route.

function isMidpoint(device: RoutingDevice): boolean {
  return device.hasInputsAndOutputs;
}

/** Devices that can be the target of a source-to-sink route: pure sinks and multiview parents. */
function isRouteDestination(device: RoutingDevice): boolean {
  return device.hasInputs && !device.hasInputsAndOutputs;
}

function isPureSource(device: RoutingDevice): boolean {
  return device.hasOutputs && !device.hasInputs;
}

/**
 * Builds the traversal index. Signal-type strings are parsed exactly once here rather than on
 * every traversal, which is the single biggest performance lever on a large system.
 *
 * Always built from `data.tieLines` - never from the filtered React Flow edges. Hiding a device or
 * a signal type in the toolbar must not change what is physically routable.
 */
function buildRouteIndex(data: RoutingDevicesAndTieLines): RouteIndex {
  const deviceByKey = new Map<string, RoutingDevice>();
  const midpointKeys = new Set<string>();
  for (const device of data.devices) {
    deviceByKey.set(device.key, device);
    if (isMidpoint(device)) midpointKeys.add(device.key);
  }

  const byDestDevice = new Map<string, IndexedTieLine[]>();
  const byDestPort = new Map<string, IndexedTieLine[]>();
  for (const tieLine of data.tieLines) {
    const indexed: IndexedTieLine = { tieLine, flags: parseSignalFlags(tieLine.signalType) };
    push(byDestDevice, tieLine.destinationDeviceKey, indexed);
    push(byDestPort, portId(tieLine.destinationDeviceKey, tieLine.destinationPortKey), indexed);
  }

  return { deviceByKey, byDestDevice, byDestPort, midpointKeys };
}

function push(map: Map<string, IndexedTieLine[]>, key: string, value: IndexedTieLine): void {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

/**
 * Every device that can reach `destDeviceKey` (optionally constrained to `destPortKey`) carrying
 * the given signal atom. Breadth-first backwards over tie lines.
 *
 * Each device is enqueued at most once, so each tie line is inspected at most twice:
 * O(devices + tieLines) time and memory. Cycles terminate on the visited check.
 */
function findReachableUpstreamDevices(
  index: RouteIndex,
  destDeviceKey: string,
  destPortKey: string | null,
  atom: string,
): ReadonlySet<string> {
  const found = new Set<string>();
  const visited = new Set<string>([destDeviceKey]);
  const queue: Array<[string, string | null]> = [[destDeviceKey, destPortKey]];

  // Cursor rather than Array.shift(), which is O(n) per call on a large frontier.
  let head = 0;
  while (head < queue.length) {
    const [deviceKey, portKey] = queue[head++];

    // Port-constrained at the seed only; every upstream hop passes null and considers all inputs.
    const incoming =
      portKey !== null
        ? index.byDestPort.get(portId(deviceKey, portKey))
        : index.byDestDevice.get(deviceKey);
    if (!incoming) continue;

    for (const { tieLine, flags } of incoming) {
      if (!flags.has(atom)) continue;

      const sourceKey = tieLine.sourceDeviceKey;
      // Any device across a matching tie line is a candidate, regardless of role...
      found.add(sourceKey);
      // ...but only a midpoint can be traversed *through* to whatever feeds it.
      if (index.midpointKeys.has(sourceKey) && !visited.has(sourceKey)) {
        visited.add(sourceKey);
        queue.push([sourceKey, null]);
      }
    }
  }

  return found;
}

/**
 * The source devices to offer for a destination port and signal type, sorted with pure sources
 * first and then by name.
 *
 * A device qualifies if ANY requested atom has a path, mirroring `ReleaseAndMakeRoute`'s
 * success-if-either behavior for AudioVideo (Extensions.cs:268-273); `matchedFlags` records which,
 * so the UI can badge a video-only match on an AudioVideo request.
 *
 * Pass `resolve` to supply a memoized traversal (see useRouteCandidates).
 */
function findCandidateSources(
  index: RouteIndex,
  destDeviceKey: string,
  destPortKey: string | null,
  signalType: string,
  resolve?: ReachabilityResolver,
): CandidateSource[] {
  const atoms = atomsOf(signalType);
  if (atoms.length === 0) return [];

  const resolveReachable: ReachabilityResolver =
    resolve ?? ((d, p, a) => findReachableUpstreamDevices(index, d, p, a));

  const matchedByDevice = new Map<string, string[]>();
  for (const atom of atoms) {
    for (const deviceKey of resolveReachable(destDeviceKey, destPortKey, atom)) {
      // A device is never a source for itself, even if the graph loops back to it.
      if (deviceKey === destDeviceKey) continue;
      const matched = matchedByDevice.get(deviceKey);
      if (matched) matched.push(atom);
      else matchedByDevice.set(deviceKey, [atom]);
    }
  }

  const candidates: CandidateSource[] = [];
  for (const [deviceKey, matchedFlags] of matchedByDevice) {
    const device = index.deviceByKey.get(deviceKey);
    // A tie line can name a device the read API filtered out; it isn't selectable.
    if (!device) continue;
    candidates.push({
      deviceKey,
      name: device.name || device.key,
      isPureSource: isPureSource(device),
      matchedFlags,
    });
  }

  candidates.sort(
    (a, b) =>
      Number(b.isPureSource) - Number(a.isPureSource) || a.name.localeCompare(b.name),
  );
  return candidates;
}

/**
 * Explains an empty candidate list.
 *
 * Routing is driven by the tie lines in the configuration, so "no sources" has exactly two causes
 * and they need completely different fixes: either nothing is wired to the port at all (a config
 * problem), or what is wired shares no part of the requested signal type (pick another type).
 *
 * The second case needs a DISJOINT type, not merely a narrower one: a candidate qualifies on any
 * single matching atom, so a Video tie line still answers an AudioVideo request - badged "video
 * only". Emptiness therefore means no incoming tie line carries any atom of the request at all.
 * Since a matching tie line always contributes at least its own source device, these two cases are
 * exhaustive.
 */
function describeNoCandidates(
  index: RouteIndex,
  destDeviceKey: string,
  destPortKey: string | null,
  signalType: string,
): string {
  const incoming =
    (destPortKey !== null
      ? index.byDestPort.get(portId(destDeviceKey, destPortKey))
      : index.byDestDevice.get(destDeviceKey)) ?? [];

  if (incoming.length === 0) {
    return "Nothing is wired to this input. Routing follows the tie lines in the configuration, and this port has none.";
  }

  const wiredFor = [...new Set(incoming.map((t) => t.tieLine.signalType))].join(", ");
  return `This input is wired for ${wiredFor}, which carries no part of ${signalType}.`;
}

export {
  buildRouteIndex,
  describeNoCandidates,
  findCandidateSources,
  findReachableUpstreamDevices,
  isMidpoint,
  isPureSource,
  isRouteDestination,
  portId,
};
export type { CandidateSource, ReachabilityResolver, RouteIndex };
