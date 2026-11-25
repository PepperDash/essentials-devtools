import { describe, expect, it } from 'vitest';
import { getUrlParameters, resolveUrl, suggestionKind } from './apiPathUrl';

describe('getUrlParameters', () => {
  it('lists each distinct parameter once, in order', () => {
    expect(
      getUrlParameters('api/{room}/devices/{key}/{room}').map((p) => p.name)
    ).toEqual(['room', 'key']);
  });

  it('recognises optional and catch-all parameters', () => {
    expect(getUrlParameters('files/{*path}/{page?}')).toEqual([
      { name: 'path', optional: false, catchAll: true },
      { name: 'page', optional: true, catchAll: false },
    ]);
  });

  it('finds nothing in a plain URL', () => {
    expect(getUrlParameters('api/types')).toEqual([]);
  });
});

describe('resolveUrl', () => {
  it('fills a parameter and says it is complete', () => {
    expect(resolveUrl('api/types/{filter}', { filter: 'Display' })).toEqual({
      url: 'api/types/Display',
      complete: true,
    });
  });

  it('leaves a missing required parameter in place and incomplete', () => {
    expect(resolveUrl('api/types/{filter}', { filter: '  ' })).toEqual({
      url: 'api/types/{filter}',
      complete: false,
    });
  });

  it('encodes the value so it cannot change the path', () => {
    expect(resolveUrl('api/types/{filter}', { filter: 'a/b c?' }).url).toBe(
      'api/types/a%2Fb%20c%3F'
    );
  });

  it('keeps slashes in a catch-all parameter', () => {
    expect(resolveUrl('files/{*path}', { path: 'a/b c' }).url).toBe(
      'files/a/b%20c'
    );
  });

  it('drops an empty optional parameter with its slash', () => {
    expect(resolveUrl('api/list/{page?}', {})).toEqual({
      url: 'api/list',
      complete: true,
    });
  });
});

describe('suggestionKind', () => {
  it('matches device, bridge and type parameters by name', () => {
    expect(suggestionKind('deviceKey')).toBe('device');
    expect(suggestionKind('key')).toBe('device');
    expect(suggestionKind('bridgeKey')).toBe('bridge');
    expect(suggestionKind('filter')).toBe('type');
    expect(suggestionKind('typeName')).toBe('type');
  });

  it('puts bridge ahead of device for a bridge device key', () => {
    expect(suggestionKind('bridgeDeviceKey')).toBe('bridge');
  });

  it('leaves other parameters as plain text', () => {
    expect(suggestionKind('page')).toBeNull();
  });
});
