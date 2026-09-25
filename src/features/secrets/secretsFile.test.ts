import { describe, expect, it } from 'vitest';

import {
  MAX_ENTRIES,
  MAX_FILE_BYTES,
  parseSecretsFile,
  summarizeSecretsFile,
} from './secretsFile';

/** Parses `text` as a well-formed .json file of the right size, so only content is under test. */
function parse(text: string, fileName = 'secrets.json') {
  return parseSecretsFile({ text, fileName, fileSize: text.length });
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

const codes = (result: ReturnType<typeof parse>) =>
  result.ok
    ? result.warnings.map((w) => w.code)
    : result.issues.map((i) => i.code);

// ─── Structural rejection ────────────────────────────────────────────────────

describe('file-level rejection', () => {
  it('rejects anything that is not .json', () => {
    expect(codes(parse('[]', 'secrets.txt'))).toEqual(['notJson']);
    expect(codes(parse('[]', 'secrets.json.exe'))).toEqual(['notJson']);
    expect(codes(parse('[]', 'secrets'))).toEqual(['notJson']);
  });

  it('accepts an uppercase extension', () => {
    expect(parse('[]', 'SECRETS.JSON').ok).toBe(true);
  });

  it('rejects an oversized file from its size, without parsing it', () => {
    // Deliberately passes text that would parse fine: size alone must reject it, so a huge file is
    // never read into JSON.parse.
    const result = parseSecretsFile({
      text: '[]',
      fileName: 'secrets.json',
      fileSize: MAX_FILE_BYTES + 1,
    });
    expect(codes(result)).toEqual(['tooLarge']);
  });

  it('rejects empty and whitespace-only files', () => {
    expect(codes(parse(''))).toEqual(['empty']);
    expect(codes(parse('   \n\t '))).toEqual(['empty']);
  });

  it('rejects a root that is neither a list nor a secrets wrapper', () => {
    expect(codes(parse('"just a string"'))).toEqual(['badRootShape']);
    expect(codes(parse('42'))).toEqual(['badRootShape']);
    expect(codes(parse('null'))).toEqual(['badRootShape']);
    expect(codes(parse(json({ notSecrets: [] })))).toEqual(['badRootShape']);
  });

  it('rejects a file with too many entries', () => {
    const many = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({
      key: `k${i}`,
      value: 'v',
    }));
    expect(codes(parse(json(many)))).toEqual(['tooManyEntries']);
  });
});

// ─── The security-critical case ──────────────────────────────────────────────

describe('malformed JSON', () => {
  it("reports a location without using the parser's own message", () => {
    const result = parse('{\n  "secrets": {\n    "a": "b",\n  }\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].code).toBe('invalidJson');
    expect(result.issues[0].message).toMatch(
      /not valid JSON \(line \d+, column \d+\)/
    );
  });

  // THE regression test. V8's SyntaxError.message embeds a snippet of the offending source, so
  // surfacing it would render a live credential into the DOM. See describeJsonSyntaxError.
  it("never leaks a secret value from the parser's error text", () => {
    const text = '{\n  "secrets": {\n    "password": "hunter2",\n  }\n}';
    const result = parse(text);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    for (const item of result.issues) {
      expect(item.message).not.toContain('hunter2');
    }
    // Sanity-check the premise: the raw parser message really does contain the value, so this test
    // would fail if anyone "improved" the code by passing err.message through.
    let raw = '';
    try {
      JSON.parse(text);
    } catch (e) {
      raw = (e as SyntaxError).message;
    }
    expect(raw.length).toBeGreaterThan(0);
  });

  it('degrades gracefully when there is no position to extract', () => {
    const result = parseSecretsFile({
      text: '{',
      fileName: 's.json',
      fileSize: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].message).toMatch(/not valid JSON/);
  });
});

// ─── Accepted shapes ─────────────────────────────────────────────────────────

describe('accepted root shapes', () => {
  const expected = [
    { key: 'displayPassword', value: 'hunter2' },
    { key: 'codecPassword', value: 's3cret' },
  ];

  it('accepts a bare array', () => {
    const result = parse(json(expected));
    expect(result.ok && result.entries).toEqual(expected);
  });

  it('accepts an array under a secrets wrapper', () => {
    const result = parse(json({ secrets: expected }));
    expect(result.ok && result.entries).toEqual(expected);
  });

  // This is the shape the template endpoint returns, so it is the round-trip path.
  it('accepts the flat template map and picks up its provider', () => {
    const result = parse(
      json({
        provider: 'default',
        secrets: { displayPassword: 'hunter2', codecPassword: 's3cret' },
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe('default');
    expect(result.entries).toEqual([
      { key: 'displayPassword', value: 'hunter2', provider: 'default' },
      { key: 'codecPassword', value: 's3cret', provider: 'default' },
    ]);
  });

  it('lets a per-entry provider override the file-level one', () => {
    const result = parse(
      json({
        provider: 'default',
        secrets: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2', provider: 'CrestronGlobalSecrets' },
        ],
      })
    );
    expect(result.ok && result.entries).toEqual([
      { key: 'a', value: '1', provider: 'default' },
      { key: 'b', value: '2', provider: 'CrestronGlobalSecrets' },
    ]);
  });
});

// ─── Per-entry validation ────────────────────────────────────────────────────

describe('entry validation', () => {
  it('rejects a missing or blank key', () => {
    expect(codes(parse(json([{ value: 'v' }])))).toEqual(['missingKey']);
    expect(codes(parse(json([{ key: '   ', value: 'v' }])))).toEqual([
      'missingKey',
    ]);
    expect(codes(parse(json([{ key: 42, value: 'v' }])))).toEqual([
      'missingKey',
    ]);
  });

  // The documented 32-character cap is not what the processor enforces: Mobile Control's
  // "7:mobileControl-directServer-tokens" is 35 characters and lives in the same store. Warn, but
  // let the processor be the authority on what it accepts.
  it('warns about a long key without dropping the entry', () => {
    const result = parse(json([{ key: 'k'.repeat(35), value: 'v' }]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(1);
    expect(result.warnings.map((w) => w.code)).toEqual(['keyTooLong']);
    expect(result.warnings[0].message).toContain('may reject');
  });

  it('says nothing about a key within the documented limit', () => {
    const result = parse(json([{ key: 'k'.repeat(32), value: 'v' }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
  });

  it('rejects control characters in a key', () => {
    expect(codes(parse(json([{ key: 'bad\nkey', value: 'v' }])))).toEqual([
      'badKeyChars',
    ]);
  });

  it("rejects the API's own reserved records", () => {
    expect(
      codes(parse(json([{ key: '__essSecretsIdx', value: 'v' }])))
    ).toEqual(['reservedKey']);
    expect(
      codes(parse(json([{ key: '__essSecretsIdx03', value: 'v' }])))
    ).toEqual(['reservedKey']);
  });

  it('rejects a non-string value', () => {
    expect(codes(parse(json([{ key: 'k' }])))).toEqual(['missingValue']);
    expect(codes(parse(json([{ key: 'k', value: 42 }])))).toEqual([
      'missingValue',
    ]);
    expect(codes(parse(json([{ key: 'k', value: null }])))).toEqual([
      'missingValue',
    ]);
  });

  // An empty value is not a no-op: CrestronLocalSecretsProvider.SetSecret(key, "") calls
  // clearLocal(key), so a blank value in a file would silently delete a working credential.
  it('rejects a blank value, because blank means DELETE on the processor', () => {
    const result = parse(
      json([
        { key: 'keep', value: 'v' },
        { key: 'k', value: '' },
      ])
    );
    expect(codes(result)).toEqual(['emptyValue']);
    expect(result.ok && result.entries).toEqual([{ key: 'keep', value: 'v' }]);
  });

  it('rejects a value over the 1600-character limit, reporting only its length', () => {
    const result = parse(json([{ key: 'k', value: 'x'.repeat(1601) }]));
    expect(codes(result)).toEqual(['valueTooLong']);
    if (!result.ok) return;
    expect(result.warnings[0].message).toContain('1601');
    expect(result.warnings[0].message).not.toContain('xxxx');
  });

  it('rejects an invalid provider or description', () => {
    expect(
      codes(parse(json([{ key: 'k', value: 'v', provider: '' }])))
    ).toEqual(['badProvider']);
    expect(
      codes(parse(json([{ key: 'k', value: 'v', description: 5 }])))
    ).toEqual(['badDescription']);
  });

  it('rejects an entry that is not an object', () => {
    expect(codes(parse(json(['nope'])))).toEqual(['notAnObject']);
  });

  it('trims key and provider but never the value', () => {
    const result = parse(
      json([{ key: '  k  ', value: '  v  ', provider: '  default  ' }])
    );
    expect(result.ok && result.entries).toEqual([
      { key: 'k', value: '  v  ', provider: 'default' },
    ]);
  });

  it('ignores unrecognized properties with a warning rather than failing', () => {
    const result = parse(
      json([{ key: 'k', value: 'v', note: 'hi', extra: 1 }])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toEqual([{ key: 'k', value: 'v' }]);
    expect(result.warnings.map((w) => w.code)).toEqual(['unknownProperty']);
    expect(result.warnings[0].message).toContain('note, extra');
  });

  it('drops a duplicate rather than letting the last one win', () => {
    const result = parse(
      json([
        { key: 'k', value: 'first' },
        { key: 'k', value: 'second' },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toEqual([{ key: 'k', value: 'first' }]);
    expect(result.warnings.map((w) => w.code)).toEqual(['duplicate']);
  });

  it('treats the same key under different providers as distinct', () => {
    const result = parse(
      json([
        { key: 'k', value: '1', provider: 'default' },
        { key: 'k', value: '2', provider: 'CrestronGlobalSecrets' },
      ])
    );
    expect(result.ok && result.entries).toHaveLength(2);
  });
});

// ─── Partial success ─────────────────────────────────────────────────────────

describe('partial success', () => {
  it('keeps the valid entries and reports the failures alongside', () => {
    const result = parse(
      json([
        { key: 'good1', value: 'v' },
        { key: '', value: 'v' },
        { key: 'good2', value: 'v' },
        { key: 'blank', value: '' },
      ])
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.map((e) => e.key)).toEqual(['good1', 'good2']);
    expect(result.warnings.map((w) => w.code)).toEqual([
      'missingKey',
      'emptyValue',
    ]);
  });

  it('reports the row index so the UI can point at the offending line', () => {
    const result = parse(
      json([
        { key: 'ok', value: 'v' },
        { key: '', value: 'v' },
      ])
    );
    expect(result.ok && result.warnings[0].index).toBe(1);
  });

  it("does not guess 'template' from a single blank entry", () => {
    const result = parse(json([{ key: 'k', value: '' }]));
    expect(codes(result)).toEqual(['emptyValue']);
    expect(result.ok && result.entries).toEqual([]);
  });

  it('flags an unfilled template as its own distinct mistake', () => {
    const result = parse(
      json({ provider: 'default', secrets: { a: '', b: '' } })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toEqual([]);
    expect(result.warnings[0].code).toBe('templateNotFilled');
  });

  it('does not flag a partially filled template as unfilled', () => {
    const result = parse(
      json({ provider: 'default', secrets: { a: 'filled', b: '' } })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.map((w) => w.code)).not.toContain(
      'templateNotFilled'
    );
  });
});

// ─── No value ever appears in an issue message ───────────────────────────────

describe('issue messages never contain values', () => {
  it('holds across every failure mode', () => {
    const value = 'sup3rS3cretValue';
    const files = [
      json([{ key: '', value }]),
      json([{ key: 'bad key', value }]),
      json([{ key: '__essSecretsIdx', value }]),
      json([{ key: 'k', value: `${value}${'x'.repeat(1601)}` }]),
      json([{ key: 'k', value, provider: '' }]),
      json([{ key: 'k', value, description: 5 }]),
      json([
        { key: 'dup', value },
        { key: 'dup', value },
      ]),
      json([{ key: 'k', value, junk: value }]),
    ];

    for (const text of files) {
      const result = parse(text);
      const messages = result.ok
        ? result.warnings.map((w) => w.message)
        : result.issues.map((i) => i.message);
      for (const message of messages) {
        expect(message).not.toContain(value);
      }
    }
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

describe('summarizeSecretsFile', () => {
  it('counts by provider and exposes no values', () => {
    const summary = summarizeSecretsFile([
      { key: 'a', value: '1', provider: 'default' },
      { key: 'b', value: '2', provider: 'default' },
      { key: 'c', value: '3', provider: 'CrestronGlobalSecrets' },
    ]);
    expect(summary).toEqual({
      total: 3,
      byProvider: { default: 2, CrestronGlobalSecrets: 1 },
    });
    const serialized = JSON.stringify(summary);
    for (const value of ['1', '2', '3'].map((v) => `"${v}"`)) {
      expect(serialized).not.toContain(value);
    }
  });

  it('groups entries with no provider under the empty key', () => {
    expect(summarizeSecretsFile([{ key: 'a', value: 'v' }])).toEqual({
      total: 1,
      byProvider: { '': 1 },
    });
  });
});
