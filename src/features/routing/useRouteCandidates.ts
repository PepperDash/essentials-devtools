import { useCallback, useEffect, useRef } from "react";

import {
  CandidateSource,
  findCandidateSources,
  findReachableUpstreamDevices,
  RouteIndex,
} from "./routeGraph";

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
  index: RouteIndex | null,
): (destDeviceKey: string, destPortKey: string | null, signalType: string) => CandidateSource[] {
  const cache = useRef(new Map<string, ReadonlySet<string>>());

  // Index identity changes only when the query data does.
  useEffect(() => {
    cache.current.clear();
  }, [index]);

  return useCallback(
    (destDeviceKey: string, destPortKey: string | null, signalType: string) => {
      if (!index) return [];
      return findCandidateSources(index, destDeviceKey, destPortKey, signalType, (d, p, atom) => {
        const cacheKey = `${d}\u0000${p ?? "*"}\u0000${atom}`;
        let reachable = cache.current.get(cacheKey);
        if (!reachable) {
          reachable = findReachableUpstreamDevices(index, d, p, atom);
          cache.current.set(cacheKey, reachable);
        }
        return reachable;
      });
    },
    [index],
  );
}

export default useRouteCandidates;
