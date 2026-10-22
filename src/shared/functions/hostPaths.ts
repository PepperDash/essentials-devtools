/**
 * Where Dev Tools is being served from, and how that maps to Essentials' API.
 *
 * On a 4-series appliance the app is at `/cws/debug/`, each program's API is at
 * `/cws/appNN/api/...`, and up to ten programs (`app01`..`app10`) can be running.
 *
 * On Virtual Control (VC-4) everything for a room sits under `/VirtualControl/Rooms/<RoomId>`: the
 * app is at `<prefix>/cws/debug/` and the room's single program has its API at `<prefix>/cws/api/...`,
 * with no `appNN` segment. The app treats the room ID as that program's "app ID", so routes such as
 * `/DEMOV3/versions` work unchanged, and `toCwsPath` rewrites `/DEMOV3/api/...` to `/api/...`.
 */

export interface HostLayout {
  /** Everything before `/cws/`: empty on an appliance, `/VirtualControl/Rooms/<RoomId>` on VC-4. */
  prefix: string;
  isVirtualControl: boolean;
  /** The VC-4 room ID, or null on an appliance. */
  roomId: string | null;
}

const APPLIANCE_APP_IDS = Array.from(
  { length: 10 },
  (_, i) => `app${String(i + 1).padStart(2, '0')}`
);

const VIRTUAL_CONTROL_PREFIX = /^\/VirtualControl\/Rooms\/([^/]+)$/i;

// Where the app is mounted. Matched as a whole rather than at the first `/cws/`, since a VC-4 room
// can itself be named CWS (`/VirtualControl/Rooms/CWS/cws/debug/`). index.html sets <base> the same way.
const APP_MOUNT = /\/cws\/debug(?:\/|$)/i;

/** Works out the host layout from a page path, by default the current page's. */
export function getHostLayout(
  pathname: string = window.location.pathname
): HostLayout {
  const mount = APP_MOUNT.exec(pathname);
  const prefix = mount && mount.index > 0 ? pathname.slice(0, mount.index) : '';
  const match = VIRTUAL_CONTROL_PREFIX.exec(prefix);

  return {
    prefix,
    isVirtualControl: match !== null,
    roomId: match ? decodeURIComponent(match[1]) : null,
  };
}

/** The CWS root every API request is relative to, e.g. `/cws` or `/VirtualControl/Rooms/DEMOV3/cws`. */
export function getCwsRoot(layout: HostLayout = getHostLayout()): string {
  return `${layout.prefix}/cws`;
}

/** The router basename: where the app itself is mounted. */
export function getRouterBasename(
  layout: HostLayout = getHostLayout()
): string {
  return `${layout.prefix}/cws/debug`;
}

/** The program IDs to try when signing in: `app01`..`app10`, or just the room on VC-4. */
export function getCandidateAppIds(
  layout: HostLayout = getHostLayout()
): string[] {
  return layout.isVirtualControl && layout.roomId
    ? [layout.roomId]
    : APPLIANCE_APP_IDS;
}

/**
 * Maps an app-relative API path such as `/app01/api/versions` to its path under the CWS root.
 * Unchanged on an appliance; on VC-4, `/<RoomId>/api/...` becomes `/api/...`.
 */
export function toCwsPath(
  url: string,
  layout: HostLayout = getHostLayout()
): string {
  if (!layout.isVirtualControl || !layout.roomId) return url;

  const roomApi = `/${layout.roomId}/api`;
  if (
    url === roomApi ||
    url.startsWith(`${roomApi}/`) ||
    url.startsWith(`${roomApi}?`)
  ) {
    return url.slice(layout.roomId.length + 1);
  }

  return url;
}

/**
 * Whether the live streams (debug console, routing feedback) should be read over HTTP polling
 * instead of their WebSockets. On VC-4 those WebSockets listen on ports the server's firewall blocks
 * unless someone opens them, while polling goes through the same HTTPS port as every API call.
 */
export function streamsUseHttpPolling(
  layout: HostLayout = getHostLayout()
): boolean {
  return layout.isVirtualControl;
}

/** The full URL for an API path on a program, e.g. `apiUrl('app01', 'routingFeedbackSession')`. */
export function apiUrl(
  appId: string,
  path: string,
  layout: HostLayout = getHostLayout()
): string {
  const trimmed = path.replace(/^\/+/, '');
  return getCwsRoot(layout) + toCwsPath(`/${appId}/api/${trimmed}`, layout);
}
