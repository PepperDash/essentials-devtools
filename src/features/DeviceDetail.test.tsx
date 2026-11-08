import { configureStore } from '@reduxjs/toolkit';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
// The request bodies POSTed to the command endpoint, in order
let commands: { methodName: string; params: unknown[] }[] = [];
let methods: { Name: string; Params: { Name: string; Type: string }[] }[] = [];

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
  if (url.includes('/deviceMethods/')) return respond(config, methods);
  if (url.includes('/deviceFeedbacks/'))
    return respond(config, {
      BoolValues: [{ FeedbackKey: 'powerIsOn', Value: power }],
      IntValues: [{ FeedbackKey: 'level', Value: '10' }],
      SerialValues: [{ FeedbackKey: 'currentInput', Value: 'hdmi1' }],
    });
  if (url.includes('/deviceCommands/')) {
    commands.push(
      typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    );
    power = true;
    return respond(config, undefined);
  }
  return Promise.reject(new Error(`Unexpected request ${url}`));
};

function renderDetail(
  item: { Key: string; Name: string; Interfaces?: string[] } = {
    Key: 'pdu-1',
    Name: 'PDU 1',
  }
) {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/app01']}>
        <Routes>
          <Route path="/:appId" element={<DeviceDetail item={item} />} />
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
    commands = [];
    methods = [{ Name: 'PowerOn', Params: [] }];
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

  it('does not ask for feedbacks of a device that does not implement IHasFeedback', async () => {
    renderDetail({
      Key: 'pdu-1',
      Name: 'PDU 1',
      Interfaces: ['IKeyed', 'IKeyName'],
    });
    await screen.findByText('PowerOn');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(count('/deviceFeedbacks/')).toBe(0);
    expect(screen.queryByText('powerIsOn')).toBeNull();
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

    // Live updates are off, so only the mutation's invalidation can fetch the new value
    await waitFor(() => expect(feedbackValue()).toBe('true'));
    expect(requests).toContain('POST /cws/app01/api/deviceCommands/pdu-1');
  });

  it('executes a method with one inline integer value, without a dialog', async () => {
    methods = [
      { Name: 'SetLevel', Params: [{ Name: 'level', Type: 'Int32' }] },
    ];
    renderDetail();
    await screen.findByText('powerIsOn');

    const execute = screen.getByRole('button', { name: 'Execute' });
    fireEvent.change(screen.getByLabelText('level (Int32)'), {
      target: { value: 'abc' },
    });
    // A non-integer blocks the send
    expect(execute).toBeDisabled();

    fireEvent.change(screen.getByLabelText('level (Int32)'), {
      target: { value: '42' },
    });
    fireEvent.click(execute);

    await waitFor(() => expect(commands).toHaveLength(1));
    expect(commands[0]).toMatchObject({
      methodName: 'SetLevel',
      params: ['42'],
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('enters several parameters in a dialog rather than inline', async () => {
    methods = [
      {
        Name: 'SetLevel',
        Params: [
          { Name: 'level', Type: 'Int32' },
          { Name: 'label', Type: 'String' },
        ],
      },
    ];
    renderDetail();
    await screen.findByText('powerIsOn');

    expect(screen.queryByLabelText('level (Int32)')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('Int32'), {
      target: { value: '7' },
    });
    fireEvent.change(within(dialog).getByPlaceholderText('String'), {
      target: { value: 'Main' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Execute' }));

    await waitFor(() => expect(commands).toHaveLength(1));
    expect(commands[0]).toMatchObject({
      methodName: 'SetLevel',
      params: ['7', 'Main'],
    });
  });

  it('offers Press & Release for a lone Boolean parameter and validates its delay', async () => {
    methods = [
      { Name: 'VolumeUp', Params: [{ Name: 'pressRelease', Type: 'Boolean' }] },
    ];
    renderDetail();
    await screen.findByText('powerIsOn');

    const press = screen.getByRole('button', { name: 'Press & Release' });
    const delay = screen.getByLabelText('Press & Release delay (seconds)');
    expect(press).toBeEnabled();

    fireEvent.change(delay, { target: { value: '0.1' } });
    expect(press).toBeDisabled();
    fireEvent.change(delay, { target: { value: '31' } });
    expect(press).toBeDisabled();

    fireEvent.change(delay, { target: { value: '0.5' } });
    fireEvent.click(press);
    await waitFor(() => expect(commands).toHaveLength(1));
    expect(commands[0].params).toEqual(['true']);
    await act(() => vi.advanceTimersByTimeAsync(600));
    await waitFor(() => expect(commands).toHaveLength(2));
    expect(commands[1].params).toEqual(['false']);
  });

  it('does not offer Press & Release when a method has other parameters', async () => {
    methods = [
      {
        Name: 'Set',
        Params: [
          { Name: 'on', Type: 'Boolean' },
          { Name: 'level', Type: 'Int32' },
        ],
      },
    ];
    renderDetail();
    await screen.findByText('powerIsOn');
    expect(
      screen.queryByRole('button', { name: 'Press & Release' })
    ).toBeNull();
  });

  it('enters object and action parameters in a dialog rather than inline', async () => {
    methods = [
      {
        Name: 'Configure',
        Params: [{ Name: 'settings', Type: 'Newtonsoft.Json.Linq.JObject' }],
      },
    ];
    renderDetail();
    await screen.findByText('powerIsOn');

    // Listed by signature, with no inline field
    expect(
      screen.getByText('settings: Newtonsoft.Json.Linq.JObject')
    ).toBeTruthy();
    expect(screen.queryByLabelText(/settings/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog).getByPlaceholderText('Newtonsoft.Json.Linq.JObject'),
      { target: { value: '{"a":1}' } }
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Execute' }));

    await waitFor(() => expect(commands).toHaveLength(1));
    expect(commands[0]).toMatchObject({
      methodName: 'Configure',
      params: ['{"a":1}'],
    });
  });

  it('shows methods with feedbacks together, and properties on their own tab', async () => {
    renderDetail();
    // The default tab: methods and the feedbacks they affect, on one screen
    expect(await screen.findByText('powerIsOn')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Execute' })).toBeTruthy();
    expect(screen.queryByText('Power')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Properties/ }));
    expect(await screen.findByText('Power')).toBeTruthy();
    expect(screen.queryByText('powerIsOn')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Methods & Feedbacks/ }));
    expect(await screen.findByText('powerIsOn')).toBeTruthy();
  });

  it('resizes the methods and feedbacks split from the keyboard, within limits', async () => {
    renderDetail();
    await screen.findByText('powerIsOn');

    const handle = screen.getByRole('separator');
    const start = Number(handle.getAttribute('aria-valuenow'));
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(start - 5);

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle.getAttribute('aria-valuenow')).toBe('20');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle.getAttribute('aria-valuenow')).toBe('20');

    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle.getAttribute('aria-valuenow')).toBe('85');

    fireEvent.doubleClick(handle);
    expect(handle.getAttribute('aria-valuenow')).toBe('65');
  });

  it('lists every feedback in one table with a type column, sortable by each column', async () => {
    renderDetail();
    await screen.findByText('powerIsOn');

    // The feedback table's rows (the methods table has its own)
    const table = screen.getByText('powerIsOn').closest('table') as HTMLElement;
    const keys = () =>
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.firstElementChild?.textContent);
    // The device's own order: Boolean, then Integer, then Serial
    expect(keys()).toEqual(['powerIsOn', 'level', 'currentInput']);
    expect(screen.getByText('Integer')).toBeTruthy();

    const heading = (name: string) =>
      screen.getByRole('button', { name: new RegExp(`^${name}`) });
    fireEvent.click(heading('Key'));
    expect(keys()).toEqual(['currentInput', 'level', 'powerIsOn']);
    fireEvent.click(heading('Key'));
    expect(keys()).toEqual(['powerIsOn', 'level', 'currentInput']);
    fireEvent.click(heading('Key'));
    expect(
      screen
        .getByRole('columnheader', { name: /^Key/ })
        .getAttribute('aria-sort')
    ).toBe('none');

    // Values: false, 10, hdmi1 sort as text, numbers numerically
    fireEvent.click(heading('Value'));
    expect(keys()).toEqual(['level', 'powerIsOn', 'currentInput']);
    fireEvent.click(heading('Type'));
    fireEvent.click(heading('Type'));
    expect(keys()).toEqual(['currentInput', 'level', 'powerIsOn']);
  });
});
