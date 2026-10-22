/**
 * The pages under `/:appId/` in App.tsx, plus that program's sign-in page. Keep in step with the
 * routes there.
 */
export const APP_SCOPED_PAGES = [
  'versions',
  'apiPaths',
  'initializationExceptions',
  'pluginLoadIssues',
  'config',
  'devices',
  'types',
  'routing',
  'mobileControl',
  'secrets',
  'console',
  'login',
];

/**
 * The program a router path belongs to, or null for the Help and sign-in pages.
 *
 * On VC-4 the program ID is the room ID, and a room can be named `help` or `login`. React Router
 * still sends `/help/console` to that room's console, since `:appId/console` outranks `help/*`, so
 * decide by the second segment rather than rejecting those names: a path whose second segment is
 * a program page belongs to the program in its first segment.
 */
export function getRouteAppId(pathname: string): string | null {
  const [first, second] = pathname.replace(/^\/+/, '').split('/');

  if (!first) return null;

  if (
    (first === 'help' || first === 'login') &&
    !(second && APP_SCOPED_PAGES.includes(second))
  ) {
    return null;
  }

  return first;
}
