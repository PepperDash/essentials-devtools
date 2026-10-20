import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosAdapter } from 'axios';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '../services/httpService';
import {
  oneSliceToRuleThemAll,
  PluginLoadIssuesReturn,
} from '../store/apiSlice';
import {
  categoryLabel,
  supportsPluginLoadIssuesApi,
} from '../store/pluginLoadIssuesContract';
import PluginLoadIssues from './PluginLoadIssues';

const api = oneSliceToRuleThemAll.apiSlice;

let response: PluginLoadIssuesReturn;
const originalAdapter = httpClient.defaults.adapter;

const adapter: AxiosAdapter = (config) => {
  const url = config.url ?? '';
  if (url.endsWith('/api/pluginLoadIssues'))
    return Promise.resolve({
      data: response,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  return Promise.reject(new Error(`Unexpected request ${url}`));
};

const renderPage = () =>
  render(
    <Provider
      store={configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (getDefault) => getDefault().concat(api.middleware),
      })}
    >
      <MemoryRouter initialEntries={['/app01']}>
        <Routes>
          <Route path="/:appId" element={<PluginLoadIssues />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const twoPlugins: PluginLoadIssuesReturn = {
  EssentialsVersion: '3.0.0-rc.11',
  IssueCount: 3,
  ErrorCount: 1,
  Plugins: [
    {
      FileName: 'OldPlugin.dll',
      AssemblyName: 'OldPlugin',
      Version: '2.0.0',
      BuiltAgainst: {},
      Status: 'Skipped',
      Issues: [
        {
          Severity: 'Error',
          Category: 'MinimumVersionNotMet',
          Message:
            'Plugin factory OldPlugin.Factory requires Essentials 3.1.0 or later',
          Detail: null,
          TriggeredBy: 'Direct load',
          TimestampUtc: '2026-10-20T14:02:11Z',
        },
      ],
    },
    {
      FileName: 'KpmgRoom.dll',
      AssemblyName: 'KpmgRoom',
      Version: '1.0.0',
      BuiltAgainst: { PepperDashEssentials: '3.0.0-rc.16' },
      Status: 'Loaded',
      Issues: [
        {
          Severity: 'Warning',
          Category: 'BuiltAgainstNewerEssentials',
          Message:
            'Built against PepperDashEssentials 3.0.0-rc.16, but Essentials 3.0.0-rc.11 is running.',
          Detail: 'Upgrade Essentials to 3.0.0-rc.16 or later.',
          TriggeredBy: 'Direct load',
          TimestampUtc: '2026-10-20T14:02:11Z',
        },
        {
          Severity: 'Warning',
          Category: 'NewerDependencyReference',
          Message:
            'References Crestron.SimplSharpPro.UI 2.21.274.0, but 2.21.128.0 is loaded.',
          Detail: 'This assembly is part of the Crestron SDK.',
          TriggeredBy: 'Direct load',
          TimestampUtc: '2026-10-20T14:02:11Z',
        },
      ],
    },
  ],
};

beforeEach(() => {
  response = twoPlugins;
  httpClient.defaults.adapter = adapter;
});

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
});

describe('Plugin Load Issues page', () => {
  it('lists each plugin with its status, build version and issues', async () => {
    renderPage();

    await screen.findByText('Plugin Load Issues');
    expect(screen.getByText(/Running Essentials 3\.0\.0-rc\.11/)).toBeTruthy();

    expect(screen.getByText('KpmgRoom.dll')).toBeTruthy();
    expect(screen.getByText('Loaded')).toBeTruthy();
    expect(
      screen.getByText('Built against PepperDashEssentials 3.0.0-rc.16')
    ).toBeTruthy();
    expect(
      screen.getByText(/References Crestron\.SimplSharpPro\.UI 2\.21\.274\.0/)
    ).toBeTruthy();

    expect(screen.getByText('OldPlugin.dll')).toBeTruthy();
    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(screen.getByText('Minimum version not met')).toBeTruthy();
    expect(screen.getAllByText('Warning')).toHaveLength(2);
    expect(screen.getAllByText('Error')).toHaveLength(1);
  });

  it('shows an issue detail on request', async () => {
    renderPage();
    await screen.findByText('Plugin Load Issues');

    expect(
      screen.queryByText('This assembly is part of the Crestron SDK.')
    ).toBeNull();

    // Only issues with detail get a toggle; the minimum-version error has none
    const toggles = screen.getAllByRole('button', { name: 'Show' });
    expect(toggles).toHaveLength(2);
    fireEvent.click(toggles[1]);

    expect(
      screen.getByText('This assembly is part of the Crestron SDK.')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide' })).toBeTruthy();
  });

  it('says so when there are no issues', async () => {
    response = {
      EssentialsVersion: '3.0.0',
      IssueCount: 0,
      ErrorCount: 0,
      Plugins: [],
    };

    renderPage();

    expect(
      await screen.findByText('No plugin load issues reported.')
    ).toBeTruthy();
    expect(screen.getByText('Running Essentials 3.0.0')).toBeTruthy();
  });
});

describe('supportsPluginLoadIssuesApi', () => {
  it('detects the route by whole path segment', () => {
    expect(
      supportsPluginLoadIssuesApi([{ Url: 'app01/api/pluginLoadIssues' }])
    ).toBe(true);
    expect(
      supportsPluginLoadIssuesApi([
        { Url: 'app01/api/initializationExceptions' },
      ])
    ).toBe(false);
    expect(
      supportsPluginLoadIssuesApi([{ Url: 'app01/api/pluginLoadIssuesOld' }])
    ).toBe(false);
    expect(supportsPluginLoadIssuesApi(undefined)).toBe(false);
  });
});

describe('categoryLabel', () => {
  it('falls back to the raw value for a category this app does not know', () => {
    expect(categoryLabel('LoadFailure')).toBe('Load failure');
    expect(
      categoryLabel(
        'SomethingNew' as unknown as Parameters<typeof categoryLabel>[0]
      )
    ).toBe('SomethingNew');
  });
});
