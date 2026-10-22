import { describe, expect, it } from 'vitest';
import {
  apiUrl,
  getCandidateAppIds,
  getCwsRoot,
  getHostLayout,
  getRouterBasename,
  toCwsPath,
} from './hostPaths';

const appliance = getHostLayout('/cws/debug/app01/versions');
const vc4 = getHostLayout(
  '/VirtualControl/Rooms/DEMOV3/cws/debug/DEMOV3/versions'
);

describe('getHostLayout', () => {
  it('reads an appliance path as having no prefix', () => {
    expect(appliance).toEqual({
      prefix: '',
      isVirtualControl: false,
      roomId: null,
    });
  });

  it('reads a VC-4 path as a room', () => {
    expect(vc4).toEqual({
      prefix: '/VirtualControl/Rooms/DEMOV3',
      isVirtualControl: true,
      roomId: 'DEMOV3',
    });
  });

  it('handles the bare app root and other casings', () => {
    expect(getHostLayout('/virtualcontrol/rooms/LDN0000/CWS/debug/')).toEqual({
      prefix: '/virtualcontrol/rooms/LDN0000',
      isVirtualControl: true,
      roomId: 'LDN0000',
    });
  });

  it('treats a page outside /cws (tests, local tools) as an appliance', () => {
    expect(getHostLayout('/')).toEqual({
      prefix: '',
      isVirtualControl: false,
      roomId: null,
    });
  });
});

describe('paths derived from the layout', () => {
  it('keeps the appliance paths the app has always used', () => {
    expect(getCwsRoot(appliance)).toBe('/cws');
    expect(getRouterBasename(appliance)).toBe('/cws/debug');
    expect(getCandidateAppIds(appliance)).toEqual([
      'app01',
      'app02',
      'app03',
      'app04',
      'app05',
      'app06',
      'app07',
      'app08',
      'app09',
      'app10',
    ]);
  });

  it('mounts under the room on VC-4, with the room as the only program', () => {
    expect(getCwsRoot(vc4)).toBe('/VirtualControl/Rooms/DEMOV3/cws');
    expect(getRouterBasename(vc4)).toBe(
      '/VirtualControl/Rooms/DEMOV3/cws/debug'
    );
    expect(getCandidateAppIds(vc4)).toEqual(['DEMOV3']);
  });
});

describe('toCwsPath', () => {
  it('leaves appliance paths alone', () => {
    expect(toCwsPath('/app01/api/versions', appliance)).toBe(
      '/app01/api/versions'
    );
  });

  it("maps the room's API to VC-4's /api base", () => {
    expect(toCwsPath('/DEMOV3/api/versions', vc4)).toBe('/api/versions');
    expect(toCwsPath('/DEMOV3/api/device/appServer/info', vc4)).toBe(
      '/api/device/appServer/info'
    );
    expect(toCwsPath('/DEMOV3/api?x=1', vc4)).toBe('/api?x=1');
  });

  it('leaves other paths alone on VC-4', () => {
    expect(toCwsPath('/OTHER/api/versions', vc4)).toBe('/OTHER/api/versions');
    expect(toCwsPath('/DEMOV3/apiPaths', vc4)).toBe('/DEMOV3/apiPaths');
  });
});

describe('apiUrl', () => {
  it('builds full API URLs for both layouts', () => {
    expect(apiUrl('app01', 'routingFeedbackSession', appliance)).toBe(
      '/cws/app01/api/routingFeedbackSession'
    );
    expect(apiUrl('DEMOV3', '/routingFeedbackSession', vc4)).toBe(
      '/VirtualControl/Rooms/DEMOV3/cws/api/routingFeedbackSession'
    );
  });
});
