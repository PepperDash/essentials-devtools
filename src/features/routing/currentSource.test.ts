import { describe, expect, it } from 'vitest';

import {
  MidpointRoute,
  RoutingDevice,
  RoutingDevicesAndTieLines,
  TieLine,
} from '../../store/apiSlice';
import { resolveCurrentSource } from './currentSource';
import { buildRouteIndex } from './routeGraph';

type Role = 'source' | 'sink' | 'midpoint' | 'passthrough';

function device(key: string, role: Role): RoutingDevice {
  const flags = {
    source: { hasInputs: false, hasOutputs: true, hasInputsAndOutputs: false },
    sink: { hasInputs: true, hasOutputs: false, hasInputsAndOutputs: false },
    midpoint: { hasInputs: true, hasOutputs: true, hasInputsAndOutputs: true },
    passthrough: {
      hasInputs: true,
      hasOutputs: true,
      hasInputsAndOutputs: false,
    },
  }[role];
  return { key, name: key, ...flags };
}

function tie(
  sourceDeviceKey: string,
  sourcePortKey: string,
  destinationDeviceKey: string,
  destinationPortKey: string
): TieLine {
  return {
    sourceDeviceKey,
    sourcePortKey,
    destinationDeviceKey,
    destinationPortKey,
    signalType: 'AudioVideo',
    isInternal: false,
  };
}

function system(
  devices: RoutingDevice[],
  tieLines: TieLine[]
): RoutingDevicesAndTieLines {
  return { devices, tieLines, currentRoutes: [], sinkCurrentSources: [] };
}

const route = (inputPortKey: string, outputPortKey: string): MidpointRoute => ({
  inputPortKey,
  outputPortKey,
  signalType: 'AudioVideo',
});

// laptop -> mtx.in1 ; bluray -> mtx.in2 ; mtx.out1 -> display.hdmi1
const SIMPLE = buildRouteIndex(
  system(
    [
      device('laptop', 'source'),
      device('bluray', 'source'),
      device('mtx', 'midpoint'),
      device('display', 'sink'),
    ],
    [
      tie('laptop', 'out1', 'mtx', 'in1'),
      tie('bluray', 'out1', 'mtx', 'in2'),
      tie('mtx', 'out1', 'display', 'hdmi1'),
    ]
  )
);

describe('resolveCurrentSource', () => {
  it("follows the midpoint's active route to the real origin", () => {
    expect(
      resolveCurrentSource(
        SIMPLE,
        { mtx: [route('in1', 'out1')] },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'resolved', sourceDeviceKey: 'laptop' });
  });

  // The reported bug: switching the matrix directly must move the answer, even though the sink's
  // own current-source bookkeeping on the processor never gets updated for a midpoint switch.
  it('follows a midpoint switch without any sink-side feedback', () => {
    expect(
      resolveCurrentSource(
        SIMPLE,
        { mtx: [route('in2', 'out1')] },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'resolved', sourceDeviceKey: 'bluray' });
  });

  it('reports cleared when the feeding output has no active route', () => {
    // The device publishes feedback, and that feedback says nothing is on out1.
    expect(
      resolveCurrentSource(
        SIMPLE,
        { mtx: [route('in1', 'out9')] },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'cleared' });
    expect(
      resolveCurrentSource(SIMPLE, { mtx: [] }, 'display', 'hdmi1')
    ).toEqual({
      status: 'cleared',
    });
  });

  it('reports unknown when the midpoint publishes no feedback at all', () => {
    // Distinct from "cleared" - the caller must fall back rather than claim nothing is routed.
    expect(resolveCurrentSource(SIMPLE, {}, 'display', 'hdmi1')).toEqual({
      status: 'unknown',
    });
  });

  it('reports unknown for a port with no tie line to follow', () => {
    expect(
      resolveCurrentSource(
        SIMPLE,
        { mtx: [route('in1', 'out1')] },
        'display',
        'hdmi9'
      )
    ).toEqual({ status: 'unknown' });
  });

  it('traces through several chained matrices', () => {
    const index = buildRouteIndex(
      system(
        [
          device('cam', 'source'),
          device('mtx-a', 'midpoint'),
          device('mtx-b', 'midpoint'),
          device('display', 'sink'),
        ],
        [
          tie('cam', 'out1', 'mtx-a', 'in4'),
          tie('mtx-a', 'out2', 'mtx-b', 'in7'),
          tie('mtx-b', 'out3', 'display', 'hdmi1'),
        ]
      )
    );

    expect(
      resolveCurrentSource(
        index,
        { 'mtx-a': [route('in4', 'out2')], 'mtx-b': [route('in7', 'out3')] },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'resolved', sourceDeviceKey: 'cam' });

    // Break the chain at the upstream matrix and the whole path goes dark.
    expect(
      resolveCurrentSource(
        index,
        { 'mtx-a': [], 'mtx-b': [route('in7', 'out3')] },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'cleared' });
  });

  it('stops at a non-midpoint passthrough, which is the origin as far as routing is concerned', () => {
    const index = buildRouteIndex(
      system(
        [
          device('cam', 'source'),
          device('scaler', 'passthrough'),
          device('display', 'sink'),
        ],
        [
          tie('cam', 'out1', 'scaler', 'in1'),
          tie('scaler', 'out1', 'display', 'hdmi1'),
        ]
      )
    );
    expect(resolveCurrentSource(index, {}, 'display', 'hdmi1')).toEqual({
      status: 'resolved',
      sourceDeviceKey: 'scaler',
    });
  });

  it('terminates on a loop instead of hanging', () => {
    const index = buildRouteIndex(
      system(
        [
          device('mtx-a', 'midpoint'),
          device('mtx-b', 'midpoint'),
          device('display', 'sink'),
        ],
        [
          tie('mtx-a', 'out1', 'mtx-b', 'in1'),
          tie('mtx-b', 'out1', 'mtx-a', 'in1'),
          tie('mtx-b', 'out2', 'display', 'hdmi1'),
        ]
      )
    );
    expect(
      resolveCurrentSource(
        index,
        {
          'mtx-a': [route('in1', 'out1')],
          'mtx-b': [route('in1', 'out1'), route('in1', 'out2')],
        },
        'display',
        'hdmi1'
      )
    ).toEqual({ status: 'unknown' });
  });

  it('resolves a multiview tile by its qualified port key', () => {
    const index = buildRouteIndex(
      system(
        [
          device('cam-1', 'source'),
          device('mtx', 'midpoint'),
          device('nvx', 'sink'),
        ],
        [
          tie('cam-1', 'out1', 'mtx', 'in1'),
          tie('mtx', 'out5', 'nvx', 'tile2:tileInput'),
        ]
      )
    );
    expect(
      resolveCurrentSource(
        index,
        { mtx: [route('in1', 'out5')] },
        'nvx',
        'tile2:tileInput'
      )
    ).toEqual({ status: 'resolved', sourceDeviceKey: 'cam-1' });
  });
});
