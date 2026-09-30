import { configureStore } from '@reduxjs/toolkit';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '../services/httpService';
import { oneSliceToRuleThemAll } from '../store/apiSlice';
import { POLL_INTERVALS_MS } from '../store/polling';
import DeviceDetail from './DeviceDetail';

const api = oneSliceToRuleThemAll.apiSlice;

// What the processor currently reports; tests change it to simulate the device changing
let power = false;
let requests: string[] = [];

const respond = (config: InternalAxiosRequestConfig, data: unknown) =>
  Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });

const adapter: AxiosAdapter = (config) => {
  const url = config.url ?? '';
  requests.push(`${config.method?.toUpperCase()} ${url}`);
  if (url.includes('/deviceProperties/'))
    return respond(config, [
      {
        Name: 'Power',
        Type: 'Boolean',
        Value: String(power),
        CanRead: true,
        canWrite: false,
      },
    ]);
  if (url.includes('/deviceMethods/'))
    return respond(config, [{ Name: 'PowerOn', Params: [] }]);
  if (url.includes('/deviceFeedbacks/'))
    return respond(config, {
      BoolValues: [{ FeedbackKey: 'powerIsOn', Value: power }],
      IntValues: [],
      SerialValues: [],
    });
  if (url.includes('/deviceCommands/')) {
    power = true;
    return respond(config, undefined);
  }
  return Promise.reject(new Error(`Unexpected request ${url}`));
};

function renderDetail() {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/app01']}>
        <Routes>
          <Route
            path="/:appId"
            element={<DeviceDetail item={{ Key: 'pdu-1', Name: 'PDU 1' }} />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const count = (path: string) =>
  requests.filter((r) => r.startsWith('GET') && r.includes(path)).length;

// The Boolean feedback table's value cell
const feedbackValue = () =>
  screen.getByText('powerIsOn').closest('tr')?.lastElementChild?.textContent;

describe('DeviceDetail live updates', () => {
  let originalAdapter: typeof httpClient.defaults.adapter;

  beforeEach(() => {
    power = false;
    requests = [];
    originalAdapter = httpClient.defaults.adapter;
    httpClient.defaults.adapter = adapter;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    vi.useRealTimers();
  });

  it('picks up values that change on the device', async () => {
    renderDetail();
    await screen.findByText('powerIsOn');
    expect(feedbackValue()).toBe('false');

    power = true;
    await act(() =>
      vi.advanceTimersByTimeAsync(POLL_INTERVALS_MS.deviceValues)
    );

    expect(feedbackValue()).toBe('true');
    expect(count('/deviceProperties/')).toBeGreaterThanOrEqual(2);
    // Methods don't change at runtime, so they aren't polled
    expect(count('/deviceMethods/')).toBe(1);
  });

  it('stops polling when live updates are turned off, and still refreshes on demand', async () => {
    renderDetail();
    await screen.findByText('powerIsOn');

    fireEvent.click(screen.getByLabelText(/Live updates/));
    const before = count('/deviceFeedbacks/');
    power = true;
    await act(() =>
      vi.advanceTimersByTimeAsync(POLL_INTERVALS_MS.deviceValues * 3)
    );

    expect(count('/deviceFeedbacks/')).toBe(before);
    expect(feedbackValue()).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(feedbackValue()).toBe('true');
  });

  it('refetches straight after executing a method', async () => {
    renderDetail();
    await screen.findByText('powerIsOn');
    fireEvent.click(screen.getByLabelText(/Live updates/));

    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));
    const dialogExecute = await screen.findAllByRole('button', {
      name: 'Execute',
    });
    fireEvent.click(dialogExecute[dialogExecute.length - 1]);

    // Live updates are off, so only the mutation's invalidation can fetch the new value
    await waitFor(() => expect(feedbackValue()).toBe('true'));
    expect(requests).toContain('POST /cws/app01/api/deviceCommands/pdu-1');
  });
});
