import { describe, expect, it } from 'vitest';

import { MidpointRoute, SinkRoute } from '../../store/apiSlice';
import {
  clearMidpointOutputCommand,
  clearSinkCommand,
  midpointSwitchCommand,
  sinkRouteCommand,
} from '../../store/routingCommands';
import {
  agePendingRoutes,
  isExpectationMet,
  PENDING_CLEANUP_MS,
  PENDING_TIMEOUT_MS,
  PendingRoute,
  pendingFromCommand,
  pendingId,
} from './pendingRoutes';

const NOW = 1_700_000_000_000;

const sinks = (routes: Record<string, SinkRoute[]>) => routes;
const midpoints = (routes: Record<string, MidpointRoute[]>) => routes;

describe('pendingFromCommand', () => {
  it('watches the destination input and the requested source for a sinkRoute', () => {
    expect(
      pendingFromCommand(
        sinkRouteCommand('display-1', 'hdmiIn1', 'laptop-1', 'AudioVideo'),
        NOW
      )
    ).toEqual({
      deviceKey: 'display-1',
      portKey: 'hdmiIn1',
      kind: 'sinkInput',
      expectedSourceDeviceKey: 'laptop-1',
      expectedInputPortKey: null,
      startedAt: NOW,
    });
  });

  it('watches the midpoint OUTPUT port, and the requested input, for a midpointSwitch', () => {
    expect(
      pendingFromCommand(
        midpointSwitchCommand('dm-1', 'inputCard3', 'outputCard5', 'Video'),
        NOW
      )
    ).toEqual({
      deviceKey: 'dm-1',
      portKey: 'outputCard5',
      kind: 'midpointOutput',
      expectedSourceDeviceKey: null,
      expectedInputPortKey: 'inputCard3',
      startedAt: NOW,
    });
  });

  it('expects the absence of a route for both clear commands', () => {
    const sinkClear = pendingFromCommand(
      clearSinkCommand('display-1', 'hdmiIn1'),
      NOW
    );
    expect(sinkClear).toMatchObject({
      kind: 'sinkInput',
      portKey: 'hdmiIn1',
      expectedSourceDeviceKey: null,
      expectedInputPortKey: null,
    });

    const midpointClear = pendingFromCommand(
      clearMidpointOutputCommand('dm-1', 'outputCard5', 'AudioVideo'),
      NOW
    );
    expect(midpointClear).toMatchObject({
      kind: 'midpointOutput',
      portKey: 'outputCard5',
      expectedSourceDeviceKey: null,
      expectedInputPortKey: null,
    });
  });

  it('returns null when there is no port to mark', () => {
    // clearSink may omit inputPortKey, meaning "clear whatever this sink has".
    expect(
      pendingFromCommand({ command: 'clearSink', deviceKey: 'display-1' }, NOW)
    ).toBeNull();
  });

  it('keys markers uniquely per device and port', () => {
    expect(pendingId('a', 'b')).not.toBe(pendingId('b', 'a'));
    expect(pendingId('a', 'b')).toBe(pendingId('a', 'b'));
  });
});

describe('isExpectationMet - sink routes', () => {
  const routePending = pendingFromCommand(
    sinkRouteCommand('display-1', 'hdmiIn1', 'laptop-1', 'AudioVideo'),
    NOW
  )!;

  it('is unmet while nothing is reported', () => {
    expect(isExpectationMet(sinks({}), midpoints({}), routePending)).toBe(
      false
    );
  });

  it('is met once the requested source is reported on that port', () => {
    const state = sinks({
      'display-1': [
        {
          inputPortKey: 'hdmiIn1',
          sourceDeviceKey: 'laptop-1',
          signalType: 'AudioVideo',
        },
      ],
    });
    expect(isExpectationMet(state, midpoints({}), routePending)).toBe(true);
  });

  it('stays unmet when a different source lands on that port', () => {
    const state = sinks({
      'display-1': [
        {
          inputPortKey: 'hdmiIn1',
          sourceDeviceKey: 'bluray-1',
          signalType: 'AudioVideo',
        },
      ],
    });
    expect(isExpectationMet(state, midpoints({}), routePending)).toBe(false);
  });

  it('stays unmet when the right source lands on a different port', () => {
    const state = sinks({
      'display-1': [
        {
          inputPortKey: 'hdmiIn2',
          sourceDeviceKey: 'laptop-1',
          signalType: 'AudioVideo',
        },
      ],
    });
    expect(isExpectationMet(state, midpoints({}), routePending)).toBe(false);
  });

  it('resolves a clear only once the entry is gone', () => {
    const clearPending = pendingFromCommand(
      clearSinkCommand('display-1', 'hdmiIn1'),
      NOW
    )!;
    const stillRouted = sinks({
      'display-1': [
        {
          inputPortKey: 'hdmiIn1',
          sourceDeviceKey: 'laptop-1',
          signalType: 'AudioVideo',
        },
      ],
    });

    expect(isExpectationMet(stillRouted, midpoints({}), clearPending)).toBe(
      false
    );
    expect(isExpectationMet(sinks({}), midpoints({}), clearPending)).toBe(true);
    // Another tile on the same decoder staying routed must not block the cleared one.
    expect(
      isExpectationMet(
        sinks({
          'display-1': [
            {
              inputPortKey: 'hdmiIn2',
              sourceDeviceKey: 'bluray-1',
              signalType: 'AudioVideo',
            },
          ],
        }),
        midpoints({}),
        clearPending
      )
    ).toBe(true);
  });

  it('tracks a multiview tile by its qualified port key', () => {
    const tilePending = pendingFromCommand(
      sinkRouteCommand('nvx-1', 'tile2:tileInput', 'cam-2', 'Video'),
      NOW
    )!;
    const state = sinks({
      'nvx-1': [
        {
          inputPortKey: 'tile1:tileInput',
          sourceDeviceKey: 'cam-1',
          signalType: 'Video',
        },
        {
          inputPortKey: 'tile2:tileInput',
          sourceDeviceKey: 'cam-2',
          signalType: 'Video',
        },
      ],
    });
    expect(isExpectationMet(state, midpoints({}), tilePending)).toBe(true);
  });
});

describe('isExpectationMet - midpoint routes', () => {
  const switchPending = pendingFromCommand(
    midpointSwitchCommand('dm-1', 'inputCard3', 'outputCard5', 'Video'),
    NOW
  )!;

  it('is met once the output reports the requested input', () => {
    const state = midpoints({
      'dm-1': [
        {
          inputPortKey: 'inputCard3',
          outputPortKey: 'outputCard5',
          signalType: 'Video',
        },
      ],
    });
    expect(isExpectationMet(sinks({}), state, switchPending)).toBe(true);
  });

  it('stays unmet when another output was switched instead', () => {
    const state = midpoints({
      'dm-1': [
        {
          inputPortKey: 'inputCard3',
          outputPortKey: 'outputCard6',
          signalType: 'Video',
        },
      ],
    });
    expect(isExpectationMet(sinks({}), state, switchPending)).toBe(false);
  });

  it('resolves a midpoint clear only once that output has no route', () => {
    const clearPending = pendingFromCommand(
      clearMidpointOutputCommand('dm-1', 'outputCard5', 'AudioVideo'),
      NOW
    )!;
    const stillRouted = midpoints({
      'dm-1': [
        {
          inputPortKey: 'inputCard3',
          outputPortKey: 'outputCard5',
          signalType: 'Video',
        },
      ],
    });
    const otherOutputOnly = midpoints({
      'dm-1': [
        {
          inputPortKey: 'inputCard3',
          outputPortKey: 'outputCard6',
          signalType: 'Video',
        },
      ],
    });

    expect(isExpectationMet(sinks({}), stillRouted, clearPending)).toBe(false);
    expect(isExpectationMet(sinks({}), otherOutputOnly, clearPending)).toBe(
      true
    );
  });
});

describe('agePendingRoutes', () => {
  const entry = (startedAt: number, timedOut?: boolean): PendingRoute => ({
    deviceKey: 'display-1',
    portKey: 'hdmiIn1',
    kind: 'sinkInput',
    expectedSourceDeviceKey: 'laptop-1',
    expectedInputPortKey: null,
    startedAt,
    timedOut,
  });

  it('returns the same object when nothing aged, so a state update can bail out', () => {
    const pending = { a: entry(NOW) };
    expect(agePendingRoutes(pending, NOW + 1_000)).toBe(pending);
  });

  it('flags an entry past the timeout', () => {
    const result = agePendingRoutes(
      { a: entry(NOW) },
      NOW + PENDING_TIMEOUT_MS + 1
    );
    expect(result.a.timedOut).toBe(true);
  });

  it('does not re-flag an already-flagged entry', () => {
    const pending = { a: entry(NOW, true) };
    expect(agePendingRoutes(pending, NOW + PENDING_TIMEOUT_MS + 1)).toBe(
      pending
    );
  });

  it('drops an entry once the warning period is over', () => {
    const result = agePendingRoutes(
      { a: entry(NOW, true) },
      NOW + PENDING_TIMEOUT_MS + PENDING_CLEANUP_MS + 1
    );
    expect(result).toEqual({});
  });

  it('ages each entry independently', () => {
    const result = agePendingRoutes(
      { fresh: entry(NOW), stale: entry(NOW - PENDING_TIMEOUT_MS - 1) },
      NOW
    );
    expect(result.fresh.timedOut).toBeUndefined();
    expect(result.stale.timedOut).toBe(true);
  });
});
