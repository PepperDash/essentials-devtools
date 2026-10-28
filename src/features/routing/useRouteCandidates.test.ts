import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoutingDevicesAndTieLines } from '../../store/apiSlice';
import * as routeGraph from './routeGraph';
import { buildRouteIndex } from './routeGraph';
import useRouteCandidates from './useRouteCandidates';

function system(): RoutingDevicesAndTieLines {
  const port = {
    signalType: 'AudioVideo',
    connectionType: 'Hdmi',
    isInternal: false,
  };
  return {
    devices: [
      {
        key: 'laptop',
        name: 'Laptop',
        hasInputs: false,
        hasOutputs: true,
        hasInputsAndOutputs: false,
        outputPorts: [{ key: 'out1', ...port }],
      },
      {
        key: 'display',
        name: 'Display',
        hasInputs: true,
        hasOutputs: false,
        hasInputsAndOutputs: false,
        inputPorts: [{ key: 'hdmi1', ...port }],
      },
    ],
    tieLines: [
      {
        sourceDeviceKey: 'laptop',
        sourcePortKey: 'out1',
        destinationDeviceKey: 'display',
        destinationPortKey: 'hdmi1',
        signalType: 'AudioVideo',
        isInternal: false,
      },
    ],
    currentRoutes: [],
    sinkCurrentSources: [],
  };
}

describe('useRouteCandidates', () => {
  it('returns candidates for a destination port', () => {
    const { result } = renderHook(() =>
      useRouteCandidates(buildRouteIndex(system()))
    );
    expect(
      result.current('display', 'hdmi1', 'AudioVideo').map((c) => c.deviceKey)
    ).toEqual(['laptop']);
  });

  it('returns nothing when there is no index yet', () => {
    const { result } = renderHook(() => useRouteCandidates(null));
    expect(result.current('display', 'hdmi1', 'AudioVideo')).toEqual([]);
  });

  it('traverses once per (port, atom) and reuses the result on repeat queries', () => {
    const spy = vi.spyOn(routeGraph, 'findReachableUpstreamDevices');
    const index = buildRouteIndex(system());
    const { result } = renderHook(() => useRouteCandidates(index));

    // AudioVideo decomposes into two atoms, so the first call is two traversals.
    result.current('display', 'hdmi1', 'AudioVideo');
    expect(spy).toHaveBeenCalledTimes(2);

    result.current('display', 'hdmi1', 'AudioVideo');
    expect(spy).toHaveBeenCalledTimes(2);

    // Video reuses the cached Video atom rather than traversing again.
    result.current('display', 'hdmi1', 'Video');
    expect(spy).toHaveBeenCalledTimes(2);

    // A different port is a different cache key.
    result.current('display', 'hdmi2', 'Video');
    expect(spy).toHaveBeenCalledTimes(3);

    spy.mockRestore();
  });

  it('clears the cache when the index identity changes', () => {
    const spy = vi.spyOn(routeGraph, 'findReachableUpstreamDevices');
    const { result, rerender } = renderHook(
      ({ index }) => useRouteCandidates(index),
      { initialProps: { index: buildRouteIndex(system()) } }
    );

    result.current('display', 'hdmi1', 'Video');
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ index: buildRouteIndex(system()) });
    result.current('display', 'hdmi1', 'Video');
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });

  // The popover asks for candidates while it renders (useMemo). A lookup made in the first render
  // after the wiring changes must see the new wiring, not traversals cached from the old one.
  it('uses the new wiring in the same render the index changes', () => {
    const rewired = system();
    rewired.tieLines = [];
    const original = buildRouteIndex(system());
    const { result, rerender } = renderHook(
      ({ index }) => {
        const getCandidates = useRouteCandidates(index);
        return getCandidates('display', 'hdmi1', 'Video').map((c) => c.deviceKey);
      },
      { initialProps: { index: original } }
    );
    // Re-render with the same index, as the popover does while it's open, so the cache holds the
    // original wiring's traversal when the wiring changes.
    rerender({ index: original });
    expect(result.current).toEqual(['laptop']);

    rerender({ index: buildRouteIndex(rewired) });
    expect(result.current).toEqual([]);
  });
});
