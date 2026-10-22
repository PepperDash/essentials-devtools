import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_SCOPED_PAGES, getRouteAppId } from './routeAppId';

describe('getRouteAppId', () => {
  it.each([
    ['/app01/console', 'app01'],
    ['/app10/versions', 'app10'],
    ['/DEMOV3/routing', 'DEMOV3'],
    ['/app01/login', 'app01'],
  ])('reads %s as program %s', (path, appId) => {
    expect(getRouteAppId(path)).toBe(appId);
  });

  it.each([
    '/',
    '',
    '/login',
    '/help',
    '/help/',
    '/help/reference/api-endpoints',
  ])('reads %s as no program', (path) => {
    expect(getRouteAppId(path)).toBeNull();
  });

  // VC-4 rooms named help or login: their program pages are still that room's
  it.each([
    ['/help/console', 'help'],
    ['/help/versions', 'help'],
    ['/help/login', 'help'],
    ['/login/console', 'login'],
    ['/login/routing', 'login'],
    ['/login/login', 'login'],
  ])('reads %s as the room named %s', (path, appId) => {
    expect(getRouteAppId(path)).toBe(appId);
  });
});

describe('APP_SCOPED_PAGES', () => {
  it('lists every page routed under :appId in App.tsx', () => {
    const app = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
    // Pages are the single-segment route paths; the top-level routes all contain / or :
    const pages = [...app.matchAll(/<Route\s+path="([A-Za-z]+)"/g)]
      .map((m) => m[1])
      .filter((path) => path !== 'help');

    expect(pages.length).toBeGreaterThan(5);
    expect(APP_SCOPED_PAGES).toEqual(expect.arrayContaining(pages));
  });
});
