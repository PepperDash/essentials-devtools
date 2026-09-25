import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { authActions } from './store/auth/authSlice';
import { store } from './store/store';
import { connected } from './store/websocketSlice';

const {
  mockStartSession,
  mockStopSession,
  mockSetDoNotLoadConfig,
  mockRestart,
  mockLoadConfig,
} = vi.hoisted(() => ({
  mockStartSession: vi.fn(),
  mockStopSession: vi.fn(),
  mockSetDoNotLoadConfig: vi.fn(),
  mockRestart: vi.fn(),
  mockLoadConfig: vi.fn(),
}));

vi.mock('./store/apiSlice', async () => {
  const actual =
    await vi.importActual<typeof import('./store/apiSlice')>(
      './store/apiSlice'
    );

  return {
    ...actual,
    useGetDebugSessionMutation: () => [mockStartSession],
    useStopDebugSessionMutation: () => [mockStopSession],
    useGetDoNotLoadConfigOnNextBootQuery: () => ({
      data: { doNotLoadConfigOnNextBoot: false },
    }),
    useSetDoNotLoadConfigOnNextBootMutation: () => [mockSetDoNotLoadConfig],
    useSetRestartMutation: () => [mockRestart],
    useSetLoadConfigMutation: () => [mockLoadConfig],
  };
});

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {}
}

const renderAtRoute = (route: string) => {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [route],
  });

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );

  return router;
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  mockStartSession.mockReset();
  mockStopSession.mockReset();
  mockSetDoNotLoadConfig.mockReset();
  mockRestart.mockReset();
  mockLoadConfig.mockReset();
  store.dispatch({ type: 'commonUi/resetState' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  store.dispatch({ type: 'commonUi/resetState' });
});

it('renders the help page inside the app shell', () => {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/help']}>
        <App />
      </MemoryRouter>
    </Provider>
  );
  expect(
    screen.getByRole('heading', {
      name: /PepperDash Essentials Web Config App Documentation/i,
    })
  ).toBeInTheDocument();
});

it('clears the debug-session connection when the app route changes', async () => {
  store.dispatch(authActions.loginSuccess(['app01', 'app02']));
  store.dispatch(connected());

  const router = renderAtRoute('/app01/console');

  expect(
    await screen.findByRole('button', { name: /Stop Debug Session/i })
  ).toBeInTheDocument();

  await act(async () => {
    await router.navigate('/app02/console');
  });

  expect(store.getState().websocket.isConnected).toBe(false);
  expect(
    screen.getByRole('button', { name: /Start Debug Session/i })
  ).toBeInTheDocument();
});

it('ignores stale debug-session responses after navigating to another app', async () => {
  store.dispatch(authActions.loginSuccess(['app01', 'app02']));

  let resolveStartSession: (value: {
    url: string;
    fallbackUrl?: string;
  }) => void = () => {};

  mockStartSession.mockImplementation(() => ({
    unwrap: () =>
      new Promise((resolve) => {
        resolveStartSession = resolve;
      }),
  }));

  const router = renderAtRoute('/app01/console');

  fireEvent.click(
    await screen.findByRole('button', { name: /Start Debug Session/i })
  );

  expect(mockStartSession).toHaveBeenCalledWith({ appId: 'app01' });
  expect(store.getState().websocket.isConnecting).toBe(true);

  await act(async () => {
    await router.navigate('/app02/console');
  });

  expect(store.getState().websocket.isConnecting).toBe(false);

  await act(async () => {
    resolveStartSession({ url: 'ws://app01' });
    await Promise.resolve();
  });

  expect(FakeWebSocket.instances).toHaveLength(0);
  expect(store.getState().websocket.isConnected).toBe(false);
  expect(store.getState().websocket.isConnecting).toBe(false);
  expect(
    screen.getByRole('button', { name: /Start Debug Session/i })
  ).toBeInTheDocument();
});
