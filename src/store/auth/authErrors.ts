/**
 * True when a failed login means the program has Crestron authentication turned off, rather than
 * that the credentials were wrong. Essentials' login handler answers 500 with this message, e.g. on a
 * VC-4 room (whose own web server signs users in) or a 4-series with authentication disabled. There is
 * nothing to sign in to, so the program is available.
 */
export function isAuthenticationDisabledError(reason: unknown): boolean {
  const data = (reason as { data?: unknown } | null | undefined)?.data;
  const message =
    typeof data === 'string'
      ? data
      : (data as { Error?: unknown } | null | undefined)?.Error;

  return (
    typeof message === 'string' &&
    /authentication is not currently enabled/i.test(message)
  );
}
