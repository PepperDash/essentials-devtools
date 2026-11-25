import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosAdapter } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

const renderNav = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/app01/console']}>
        <Routes>
          <Route path="/:appId/*" element={<TopNav isConnected={false} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

// By id, because the button is named after the current page, which changes as pages are picked
const menuToggle = () => document.getElementById('nav-menu-toggle')!;

describe('TopNav menu', () => {
  beforeEach(() => {
    httpClient.defaults.adapter = adapter;
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  it('names the current page on the menu button', () => {
    renderNav();

    expect(menuToggle()).toHaveTextContent('Debug Console');
  });

  it('lists the pages in a grouped panel that closes when one is picked', () => {
    renderNav();

    fireEvent.click(menuToggle());
    expect(menuToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Runtime')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Devices' }));
    expect(menuToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the version, connection state, Help and theme switch in the bar', () => {
    renderNav();

    expect(screen.getByText(/Version:/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Disconnected/);
    expect(screen.getByRole('link', { name: /Help/ })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Dark theme' })
    ).toBeInTheDocument();
  });
});
