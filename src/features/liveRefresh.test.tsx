import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AxiosAdapter } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '../services/httpService';
import { oneSliceToRuleThemAll } from '../store/apiSlice';
import { POLL_INTERVALS_MS } from '../store/polling';
import MobileControl from './MobileControl';

const api = oneSliceToRuleThemAll.apiSlice;

// What the processor currently reports; tests change it to simulate the program changing
let clientsConnected = 0;
let configName = 'before';
let requests: string[] = [];
const originalAdapter = httpClient.defaults.adapter;

const adapter: AxiosAdapter = (config) => {
  const url = config.url ?? '';
  requests.push(`${config.method?.toUpperCase()} ${url}`);
  const respond = (data: unknown) =>
    Promise.resolve({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

  if (url.endsWith('/device/appServer/info'))
    return respond({
      directServer: {
        userAppUrl: 'http://proc/app',
        serverPort: 50000,
        tokensDefined: 1,
        clientsConnected,
        clients: [],
      },
    });
  if (url.endsWith('/device/appServer/actionPaths'))
    return respond({ actionPaths: [] });
  if (url.endsWith('/api/config')) return respond({ name: configName });
  if (url.endsWith('/api/devices'))
    return respond([{ Key: 'display-1', Name: 'Display' }]);
  if (url.endsWith('/api/loadConfig')) {
    configName = 'after';
    return respond('');
  }
  return Promise.reject(new Error(`Unexpected request ${url}`));
};

const makeStore = () =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });

const gets = (path: string) =>
  requests.filter((r) => r.startsWith('GET') && r.endsWith(path)).length;

beforeEach(() => {
  clientsConnected = 0;
  configName = 'before';
  requests = [];
  httpClient.defaults.adapter = adapter;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

describe('Mobile Control page', () => {
  it('picks up connection changes while it is open', async () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/app01']}>
          <Routes>
            <Route path="/:appId" element={<MobileControl />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    const connectedCell = () =>
      screen.getByText('Clients Connected').nextElementSibling?.textContent;
    await screen.findByText('Clients Connected');
    expect(connectedCell()).toBe('0');

    clientsConnected = 2;
    await act(() =>
      vi.advanceTimersByTimeAsync(POLL_INTERVALS_MS.mobileControlInfo)
    );

    expect(connectedCell()).toBe('2');
    // Action paths only change with a new program load, so they aren't polled
    expect(gets('/device/appServer/actionPaths')).toBe(1);
  });
});

describe('loading a config', () => {
  it('refetches the config and the devices built from it', async () => {
    const store = makeStore();
    // Subscribe as the pages would, without polling, so only invalidation can refetch
    const config = store.dispatch(
      api.endpoints.getConfig.initiate({ appId: 'app01' })
    );
    const devices = store.dispatch(
      api.endpoints.getDevices.initiate({ appId: 'app01' })
    );
    await Promise.all([config, devices]);
    expect(gets('/api/config')).toBe(1);

    await store.dispatch(
      api.endpoints.setLoadConfig.initiate({ appId: 'app01' })
    );

    await waitFor(() =>
      expect(
        api.endpoints.getConfig.select({ appId: 'app01' })(store.getState())
          .data
      ).toEqual({ name: 'after' })
    );
    expect(gets('/api/devices')).toBe(2);

    config.unsubscribe();
    devices.unsubscribe();
  });
});
