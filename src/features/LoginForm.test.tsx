import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosAdapter } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.resetModules();
});

const respond =
  (status: number, data: unknown): AxiosAdapter =>
  (config) =>
    status < 400
      ? Promise.resolve({ data, status, statusText: 'OK', headers: {}, config })
      : Promise.reject(
          Object.assign(new Error(`HTTP ${status}`), {
            isAxiosError: true,
            response: { status, data, statusText: '', headers: {}, config },
            config,
          })
        );

describe('signing in on a VC-4 room with authentication turned off', () => {
  it('posts to the room API and treats the room as available', async () => {
    // The app derives its layout from the page path when its modules load, so set the path, then
    // load a fresh copy of everything that depends on it.
    window.history.replaceState(
      null,
      '',
      '/VirtualControl/Rooms/DEMOV3/cws/debug/login'
    );
    vi.resetModules();
    const { httpClient } = await import('../services/httpService');
    const { oneSliceToRuleThemAll } = await import('../store/apiSlice');
    const { authReducer } = await import('../store/auth/authSlice');
    const { default: LoginForm } = await import('./LoginForm');
    const api = oneSliceToRuleThemAll.apiSlice;

    const urls: string[] = [];
    httpClient.defaults.adapter = (config) => {
      urls.push(config.url ?? '');
      return respond(500, {
        Error: 'Authentication is not currently enabled on the controller',
      })(config);
    };

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer, auth: authReducer },
      middleware: (getDefault) => getDefault().concat(api.middleware),
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/:appId/versions" element={<div>Versions page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'anything' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Versions page')).toBeTruthy();
    expect(urls).toEqual(['/VirtualControl/Rooms/DEMOV3/cws/api/login']);
    expect(store.getState().auth.availableApps).toEqual(['DEMOV3']);
  });
});
