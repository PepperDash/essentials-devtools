import { useCallback } from 'react';

import {
  CandidateSource,
  findCandidateSources,
  findReachableUpstreamDevices,
  RouteIndex,
} from './routeGraph';

// One traversal cache per route index. Keyed by the index itself, so a lookup always uses the
// current graph's cache (clearing a shared cache in an effect left the first render after a change
// reading traversals from the old graph), and an old cache is dropped with its index.
const cachesByIndex = new WeakMap<RouteIndex, Map<string, ReadonlySet<string>>>();

function cacheFor(index: RouteIndex): Map<string, ReadonlySet<string>> {
  let cache = cachesByIndex.get(index);
  if (!cache) {
    cache = new Map();
    cachesByIndex.set(index, cache);
  }
  return cache;
}

/**
 * Memoized candidate-source lookup for the route popover.
 *
 * The key property being exploited: a candidate set depends only on the static tie-line graph and
 * device roles - never on live route feedback. So the cache survives every WebSocket tick and is
 * invalidated only when the underlying query data changes (i.e. on refetch), which is what makes
 * it safe to hold results indefinitely.
 *
 * Traversals are computed lazily, once per (destination port, signal atom), the first time a
 * popover asks for them.
 */
function useRouteCandidates(
  index: RouteIndex | null
): (
  destDeviceKey: string,
  destPortKey: string | null,
  signalType: string
) => CandidateSource[] {
  return useCallback(
    (destDeviceKey: string, destPortKey: string | null, signalType: string) => {
      if (!index) return [];
      const cache = cacheFor(index);
      return findCandidateSources(
        index,
        destDeviceKey,
        destPortKey,
        signalType,
        (d, p, atom) => {
          const cacheKey = `${d}\u0000${p ?? '*'}\u0000${atom}`;
          let reachable = cache.get(cacheKey);
          if (!reachable) {
            reachable = findReachableUpstreamDevices(index, d, p, atom);
            cache.set(cacheKey, reachable);
          }
          return reachable;
        }
      );
    },
    [index]
  );
}

export default useRouteCandidates;
