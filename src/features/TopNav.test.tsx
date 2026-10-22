import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosAdapter } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '../services/httpService';
import { oneSliceToRuleThemAll } from '../store/apiSlice';
import { authActions, authReducer } from '../store/auth/authSlice';
import TopNav from './TopNav';

const api = oneSliceToRuleThemAll.apiSlice;
const originalAdapter = httpClient.defaults.adapter;

// The nav's capability probes aren't under test; answer them with empty data
const adapter: AxiosAdapter = (config) =>
  Promise.resolve({
    data: config.url?.endsWith('/api/apiPaths') ? { routes: [] } : [],
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

const makeStore = () => {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  store.dispatch(authActions.loginSuccess(['app01']));
  return store;
};

const BackButton = () => {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Go back</button>;
};

const renderNav = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/app01/console']}>
        <Routes>
          <Route
            path="/:appId/*"
            element={
              <>
                <TopNav isConnected={false} />
                <BackButton />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const menu = () => document.getElementById('top-nav-links');
const toggle = () => screen.getByRole('button', { name: /toggle navigation/i });

describe('TopNav collapsed menu', () => {
  beforeEach(() => {
    httpClient.defaults.adapter = adapter;
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  it('closes when a page is picked and stays closed after Back to the page it was opened on', () => {
    renderNav();

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(menu()?.closest('.navbar')?.className).toContain('top-nav-open');

    fireEvent.click(screen.getByRole('link', { name: 'Devices' }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(menu()?.closest('.navbar')?.className).not.toContain('top-nav-open');
  });
});
