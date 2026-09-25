import { describe, expect, it } from 'vitest';

import reducer, { sinkInputChanged } from './routingFeedbackSlice';

const initial = {
  midpointRoutes: {},
  sinkRoutes: {},
  layouts: {},
  connected: true,
  failedUrls: [],
};

const changed = (
  deviceKey: string,
  inputPortKey: string,
  sourceDeviceKey: string | null,
  signalType = 'AudioVideo'
) =>
  sinkInputChanged({
    type: 'sinkInputChanged',
    deviceKey,
    inputPortKey,
    sourceDeviceKey,
    signalType,
  });

describe('sinkInputChanged', () => {
  it('adds a route for a newly routed input', () => {
    const state = reducer(initial, changed('display-1', 'hdmiIn1', 'laptop-1'));
    expect(state.sinkRoutes['display-1']).toEqual([
      {
        inputPortKey: 'hdmiIn1',
        sourceDeviceKey: 'laptop-1',
        signalType: 'AudioVideo',
      },
    ]);
  });

  it('replaces the route on the same input rather than appending', () => {
    let state = reducer(initial, changed('display-1', 'hdmiIn1', 'laptop-1'));
    state = reducer(state, changed('display-1', 'hdmiIn1', 'bluray-1'));
    expect(state.sinkRoutes['display-1']).toEqual([
      {
        inputPortKey: 'hdmiIn1',
        sourceDeviceKey: 'bluray-1',
        signalType: 'AudioVideo',
      },
    ]);
  });

  it('keeps multiple tile routes under one multiview device key', () => {
    let state = reducer(initial, changed('nvx-1', 'tile1:tileInput', 'cam-1'));
    state = reducer(state, changed('nvx-1', 'tile2:tileInput', 'cam-2'));
    expect(state.sinkRoutes['nvx-1']).toHaveLength(2);
  });

  // The clear path: the processor reports a cleared route via CurrentSourcesChanged with no
  // source, and we must remove the entry rather than store a sourceless route.
  it('removes the entry when the source is cleared', () => {
    let state = reducer(initial, changed('nvx-1', 'tile1:tileInput', 'cam-1'));
    state = reducer(state, changed('nvx-1', 'tile2:tileInput', 'cam-2'));
    state = reducer(state, changed('nvx-1', 'tile1:tileInput', null));

    expect(state.sinkRoutes['nvx-1']).toEqual([
      {
        inputPortKey: 'tile2:tileInput',
        sourceDeviceKey: 'cam-2',
        signalType: 'AudioVideo',
      },
    ]);
  });

  it('treats an empty-string source as cleared too', () => {
    let state = reducer(initial, changed('display-1', 'hdmiIn1', 'laptop-1'));
    state = reducer(state, changed('display-1', 'hdmiIn1', ''));
    expect(state.sinkRoutes['display-1']).toBeUndefined();
  });

  it('drops the device key entirely once its last route is cleared', () => {
    let state = reducer(initial, changed('display-1', 'hdmiIn1', 'laptop-1'));
    state = reducer(state, changed('display-1', 'hdmiIn1', null));
    expect(state.sinkRoutes).toEqual({});
  });

  it('ignores a clear for an input that was never routed', () => {
    const state = reducer(initial, changed('display-1', 'hdmiIn1', null));
    expect(state.sinkRoutes).toEqual({});
  });
});
