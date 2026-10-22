import { describe, expect, it } from 'vitest';
import { isAuthenticationDisabledError } from './authErrors';

describe('isAuthenticationDisabledError', () => {
  it("recognises Essentials' authentication-disabled response", () => {
    expect(
      isAuthenticationDisabledError({
        status: 500,
        data: {
          Error: 'Authentication is not currently enabled on the controller',
        },
      })
    ).toBe(true);
  });

  it('accepts the message as a plain string body', () => {
    expect(
      isAuthenticationDisabledError({
        data: 'Authentication is not currently enabled on the controller',
      })
    ).toBe(true);
  });

  it('treats wrong credentials and other failures as real failures', () => {
    expect(isAuthenticationDisabledError({ status: 401, data: '' })).toBe(
      false
    );
    expect(
      isAuthenticationDisabledError({ status: 500, data: { Error: 'boom' } })
    ).toBe(false);
    expect(isAuthenticationDisabledError(undefined)).toBe(false);
    expect(isAuthenticationDisabledError(null)).toBe(false);
  });
});
