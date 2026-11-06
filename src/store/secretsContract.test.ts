import { describe, expect, it } from 'vitest';

import {
  bulkSecretsRequest,
  deleteSecretCommand,
  describeProviderStorage,
  describeSecretsError,
  hiddenRecordReason,
  programNumberFromAppId,
  DOCUMENTED_MAX_SECRET_KEY_LENGTH,
  MAX_SECRET_VALUE_LENGTH,
  maxValueLengthFor,
  pruneIndexCommand,
  rebuildIndexCommand,
  RESERVED_KEY_PREFIX,
  SECRETS_BULK_PATH,
  SECRETS_COMMAND_PATH,
  SECRETS_PATH,
  SECRETS_TEMPLATE_PATH,
  setSecretCommand,
  supportsSecretsApi,
  testSecretCommand,
  updateSecretCommand,
} from './secretsContract';

// These assertions are deliberately literal. They are the only thing standing between a rename on
// the C# side (SecretsApiContracts.cs) and a silently broken endpoint, since request bodies are
// never type-checked across the wire.
describe('command builders emit the exact wire shape', () => {
  it('set', () => {
    expect(setSecretCommand('default', 'displayPassword', 'hunter2')).toEqual({
      action: 'set',
      provider: 'default',
      key: 'displayPassword',
      value: 'hunter2',
    });
  });

  it('set with description and overwrite', () => {
    expect(
      setSecretCommand('default', 'displayPassword', 'hunter2', {
        description: 'Display admin',
        overwrite: true,
      })
    ).toEqual({
      action: 'set',
      provider: 'default',
      key: 'displayPassword',
      value: 'hunter2',
      description: 'Display admin',
      overwrite: true,
    });
  });

  it('omits optional fields rather than sending null or false', () => {
    const request = setSecretCommand('default', 'k', 'v', { overwrite: false });
    expect(request).not.toHaveProperty('overwrite');
    expect(request).not.toHaveProperty('description');
  });

  it('update', () => {
    expect(updateSecretCommand('default', 'k', 'v', 'note')).toEqual({
      action: 'update',
      provider: 'default',
      key: 'k',
      value: 'v',
      description: 'note',
    });
  });

  it('delete carries no value', () => {
    const request = deleteSecretCommand('default', 'k');
    expect(request).toEqual({
      action: 'delete',
      provider: 'default',
      key: 'k',
    });
    expect(request).not.toHaveProperty('value');
  });

  it('test carries no value', () => {
    const request = testSecretCommand('CrestronGlobalSecrets', 'k');
    expect(request).toEqual({
      action: 'test',
      provider: 'CrestronGlobalSecrets',
      key: 'k',
    });
    expect(request).not.toHaveProperty('value');
  });

  it('pruneIndex', () => {
    expect(pruneIndexCommand('default')).toEqual({
      action: 'pruneIndex',
      provider: 'default',
    });
  });

  it('rebuildIndex, with and without adoptKeys', () => {
    expect(rebuildIndexCommand('default')).toEqual({
      action: 'rebuildIndex',
      provider: 'default',
    });
    expect(rebuildIndexCommand('default', ['a', 'b'])).toEqual({
      action: 'rebuildIndex',
      provider: 'default',
      adoptKeys: ['a', 'b'],
    });
    // An empty array would read as "adopt nothing" but is indistinguishable from a bug; omit it.
    expect(rebuildIndexCommand('default', [])).not.toHaveProperty('adoptKeys');
  });
});

describe('bulk request builder', () => {
  const entries = [
    { key: 'a', value: '1' },
    { key: 'b', value: '2' },
  ];

  it('builds a preview request', () => {
    expect(
      bulkSecretsRequest('default', entries, {
        mode: 'preview',
        overwrite: false,
      })
    ).toEqual({
      mode: 'preview',
      provider: 'default',
      overwrite: false,
      secrets: entries,
    });
  });

  it('carries overwrite and the unmanaged acknowledgement on commit', () => {
    expect(
      bulkSecretsRequest('default', entries, {
        mode: 'commit',
        overwrite: true,
        allowUnmanagedOverwrite: true,
      })
    ).toEqual({
      mode: 'commit',
      provider: 'default',
      overwrite: true,
      allowUnmanagedOverwrite: true,
      secrets: entries,
    });
  });

  it('sends overwrite:false explicitly rather than omitting it', () => {
    // Omitting it would rely on the server's default; being explicit means a server-side default
    // change can never silently start overwriting credentials.
    const request = bulkSecretsRequest('default', entries, {
      mode: 'commit',
      overwrite: false,
    });
    expect(request.overwrite).toBe(false);
    expect(request).not.toHaveProperty('allowUnmanagedOverwrite');
  });
});

describe('constants match the Crestron Data Store limits', () => {
  it('uses the documented caps', () => {
    expect(DOCUMENTED_MAX_SECRET_KEY_LENGTH).toBe(32);
    expect(MAX_SECRET_VALUE_LENGTH).toBe(1600);
  });

  it('uses the agreed endpoint paths and reserved prefix', () => {
    expect(SECRETS_PATH).toBe('secrets');
    expect(SECRETS_COMMAND_PATH).toBe('secrets/command');
    expect(SECRETS_BULK_PATH).toBe('secrets/bulk');
    expect(SECRETS_TEMPLATE_PATH).toBe('secrets/template');
    expect(RESERVED_KEY_PREFIX).toBe('__essSecretsIdx');
  });
});

describe('maxValueLengthFor', () => {
  const providers = [
    {
      key: 'default',
      scope: 'local' as const,
      enumerationSupported: true,
      maxKeyLength: 32,
      maxValueLength: 1600,
    },
    {
      key: 'CrestronSecureSecrets',
      scope: 'local' as const,
      enumerationSupported: true,
      maxKeyLength: 32,
      maxValueLength: 8192,
    },
  ];

  it("uses the provider's own limit, matching the key case-insensitively", () => {
    expect(maxValueLengthFor(providers, 'CrestronSecureSecrets')).toBe(8192);
    expect(maxValueLengthFor(providers, 'crestronsecuresecrets')).toBe(8192);
    expect(maxValueLengthFor(providers, 'default')).toBe(1600);
  });

  it('falls back to the Data Store limit for an unknown provider or a bad figure', () => {
    expect(maxValueLengthFor(providers, 'missing')).toBe(
      MAX_SECRET_VALUE_LENGTH
    );
    expect(maxValueLengthFor(providers, undefined)).toBe(
      MAX_SECRET_VALUE_LENGTH
    );
    expect(
      maxValueLengthFor(
        [{ ...providers[1], maxValueLength: 0 }],
        'CrestronSecureSecrets'
      )
    ).toBe(MAX_SECRET_VALUE_LENGTH);
  });
});

describe('describeProviderStorage', () => {
  it('says the encrypted provider stores per program, with its limits', () => {
    expect(
      describeProviderStorage(
        {
          scope: 'local',
          encrypted: true,
          maxValueLength: 4096,
          maxTotalLength: 6144,
          maxSecrets: 8,
        },
        'app01',
        'PepperDashEssentials'
      )
    ).toEqual({
      option: 'encrypted, app01',
      summary:
        'Encrypted. Stored for app01. Up to 4,096 characters per secret, 6,144 in total, 8 secrets.',
    });
  });

  it('says the plain local provider is shared by programs with the same name', () => {
    expect(
      describeProviderStorage(
        { scope: 'local', encrypted: false, maxValueLength: 1600 },
        'app02',
        'PepperDashEssentials'
      )
    ).toEqual({
      option: 'not encrypted',
      summary:
        'Not encrypted. Shared with other programs named PepperDashEssentials on this processor. Up to 1,600 characters per secret.',
    });
  });

  it('says a global provider can be read by every program', () => {
    expect(
      describeProviderStorage(
        { scope: 'global', encrypted: false, maxValueLength: 1600 },
        'app01',
        'PepperDashEssentials'
      )
    ).toEqual({
      option: 'all programs',
      summary:
        'Not encrypted. Every program on this processor can read these. Up to 1,600 characters per secret.',
    });
  });

  it('states nothing an older processor does not report', () => {
    expect(describeProviderStorage({ scope: 'local' }, 'app01')).toEqual({
      option: 'this program',
      summary: '',
    });
  });
});

describe('hiddenRecordReason', () => {
  const me = 'PepperDashEssentials';
  const reason = (key: string, owner = me, number: number | undefined = 1) =>
    hiddenRecordReason({ key, owner }, me, number);

  it("keeps this program's own and shared records", () => {
    expect(reason('Local_SecureStorage_1:iotCert')).toBeNull();
    expect(reason('DoNotLoadOnNextBoot')).toBeNull();
    expect(reason('1:mobileControl-directServer-tokens')).toBeNull();
  });

  it("hides records carrying another program's number", () => {
    expect(reason('Local_SecureStorage_2:iotCert')).toBe('otherApp');
    expect(reason('2:mobileControl-directServer-tokens')).toBe('otherApp');
    expect(reason('Local_SecureStorage_1:iotCert', me, 2)).toBe('otherApp');
  });

  it("keeps this program's encrypted index and key list", () => {
    expect(reason('Local_SecureStorage_1:__essSecretsIdx00')).toBeNull();
    expect(reason('Local_SecureStorage_1:__essSecretsIdxKeys')).toBeNull();
  });

  it('hides records owned by a program with another name', () => {
    expect(reason('probeFromApp2', 'CdsScopeProbe')).toBe('otherProgram');
  });

  it('keeps numbered records when the program number is unknown', () => {
    expect(
      hiddenRecordReason(
        { key: 'Local_SecureStorage_2:iotCert', owner: me },
        me,
        undefined
      )
    ).toBeNull();
  });
});

describe('programNumberFromAppId', () => {
  it('reads the number from an app id', () => {
    expect(programNumberFromAppId('app01')).toBe(1);
    expect(programNumberFromAppId('app10')).toBe(10);
    expect(programNumberFromAppId(undefined)).toBeUndefined();
    expect(programNumberFromAppId('debug')).toBeUndefined();
  });
});

describe('supportsSecretsApi', () => {
  const routes = (...urls: string[]) => urls.map((Url) => ({ Url }));

  it('detects the secrets routes', () => {
    expect(supportsSecretsApi(routes('/cws/app01/api/secrets'))).toBe(true);
    expect(supportsSecretsApi(routes('/api/secrets/bulk'))).toBe(true);
    expect(supportsSecretsApi(routes('secrets'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(supportsSecretsApi(routes('/api/Secrets/Command'))).toBe(true);
  });

  // The reason this matches a whole path segment instead of using .includes()
  it('is not fooled by an unrelated route containing the substring', () => {
    expect(supportsSecretsApi(routes('/api/mysecretsthing'))).toBe(false);
    expect(supportsSecretsApi(routes('/api/secretsmanager'))).toBe(false);
    expect(supportsSecretsApi(routes('/api/devicesecrets'))).toBe(false);
  });

  it('returns false for an older processor and for an unresolved probe', () => {
    expect(supportsSecretsApi(routes('/api/devices', '/api/versions'))).toBe(
      false
    );
    expect(supportsSecretsApi([])).toBe(false);
    expect(supportsSecretsApi(undefined)).toBe(false);
  });

  it('tolerates a route with no Url', () => {
    expect(supportsSecretsApi([{}])).toBe(false);
  });
});

describe('describeSecretsError', () => {
  it("prefers the endpoint's structured message", () => {
    expect(
      describeSecretsError({
        status: 409,
        data: {
          status: 'error',
          error: { code: 'alreadyExists', message: 'Key already exists.' },
        },
      })
    ).toBe('Key already exists.');
  });

  it('falls back to the status code when there is no body', () => {
    expect(describeSecretsError({ status: 500 })).toBe(
      'Secrets request failed (500).'
    );
  });

  it('reports a transport failure plainly', () => {
    expect(describeSecretsError({ status: 'FETCH_ERROR' })).toBe(
      'Could not reach the processor.'
    );
    expect(describeSecretsError(undefined)).toBe(
      'Could not reach the processor.'
    );
  });

  // SECURITY: the describer reads only the response body. A submitted value living on the error
  // object elsewhere must never reach the rendered string.
  it('never echoes a submitted value back into the message', () => {
    const message = describeSecretsError({
      status: 400,
      data: {
        status: 'error',
        error: { code: 'valueTooLong', message: 'Value is too long.' },
      },
      config: { data: JSON.stringify({ value: 'hunter2' }) },
    });
    expect(message).not.toContain('hunter2');
    expect(message).toBe('Value is too long.');
  });
});
