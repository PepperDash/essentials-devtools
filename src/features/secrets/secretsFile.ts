/**
 * Parsing and validating a bulk secrets file.
 *
 * Pure by design - no React, no DOM, no `File`. It takes text that has already been read, which is
 * what makes the risky logic here trivially testable.
 *
 * SECURITY: a file handled by this module is full of plaintext credentials. Two rules follow, and
 * both are enforced by tests:
 *
 *   1. **No issue message ever contains a value.** In particular, `JSON.parse`'s own error text is
 *      never surfaced: V8 embeds a snippet of the offending source in `SyntaxError.message`, so for
 *      a secrets file that snippet can literally be `"password": "hunter2"` - which would then be
 *      rendered straight into the DOM. Only the numeric offset is extracted, and the message is
 *      written here.
 *   2. **Nothing is logged.** There are no `console.*` calls in this file or anywhere under
 *      `features/secrets/`, deliberately.
 */

import {
  BulkSecretEntry,
  DOCUMENTED_MAX_SECRET_KEY_LENGTH,
  MAX_SECRET_VALUE_LENGTH,
  RESERVED_KEY_PREFIX,
} from '../../store/secretsContract';

/** Generous for a credential list, small enough that a stray binary never reaches JSON.parse. */
export const MAX_FILE_BYTES = 256 * 1024;
/** Matches the processor's own per-batch cap. */
export const MAX_ENTRIES = 500;

export type SecretsFileIssueCode =
  // Structural - these abort the whole file.
  | 'notJson'
  | 'tooLarge'
  | 'empty'
  | 'invalidJson'
  | 'badRootShape'
  | 'tooManyEntries'
  // Raised by BulkApplyModal rather than the parser: the file names a provider other than the one
  // being applied to.
  | 'providerMismatch'
  // Per-entry - these drop one row and are reported alongside the rows that survived.
  | 'notAnObject'
  | 'missingKey'
  | 'keyTooLong'
  | 'badKeyChars'
  | 'reservedKey'
  | 'missingValue'
  | 'emptyValue'
  | 'valueTooLong'
  | 'badProvider'
  | 'badDescription'
  | 'duplicate'
  // Advisory.
  | 'templateNotFilled'
  | 'unknownProperty';

export interface SecretsFileIssue {
  code: SecretsFileIssueCode;
  /** Safe to render. Never contains a secret value. */
  message: string;
  /** 0-based index into the file's entries, for row-level issues. */
  index?: number;
  key?: string;
}

export interface SecretsFileSummary {
  total: number;
  byProvider: Record<string, number>;
}

export type ParseSecretsFileResult =
  | {
      ok: true;
      entries: BulkSecretEntry[];
      /** Provider named in the file itself. The downloaded template includes one. */
      provider?: string;
      warnings: SecretsFileIssue[];
      summary: SecretsFileSummary;
    }
  | { ok: false; issues: SecretsFileIssue[] };

interface ParseInput {
  text: string;
  fileName: string;
  fileSize: number;
}

// Matching control characters is the point, so no-control-regex doesn't apply
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Builds a location hint from a SyntaxError without using any of its text.
 *
 * Modern V8 messages look like `Expected ',' or '}' after property value in JSON at position 214
 * (line 9 column 3)` - useful, but they also quote the surrounding source. Take the offset only.
 */
function describeJsonSyntaxError(error: unknown, text: string): string {
  const raw = error instanceof SyntaxError ? error.message : '';
  const match = /position (\d+)/.exec(raw);
  if (!match) return 'The file is not valid JSON.';

  const position = Math.min(Number(match[1]), text.length);
  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const column = position - before.lastIndexOf('\n');
  return `The file is not valid JSON (line ${line}, column ${column}).`;
}

function issue(
  code: SecretsFileIssueCode,
  message: string,
  extra: { index?: number; key?: string } = {}
): SecretsFileIssue {
  return { code, message, ...extra };
}

/** Raw entry as it appears in the file, before validation. */
interface RawEntry {
  index: number;
  key: unknown;
  value: unknown;
  provider?: unknown;
  description?: unknown;
  extraProperties?: string[];
}

const KNOWN_ENTRY_PROPERTIES = new Set([
  'key',
  'value',
  'provider',
  'description',
]);

/**
 * Normalizes the three accepted shapes into a flat list.
 *
 * Accepted, in order of how likely they are to arrive:
 *   `{ "provider": "default", "secrets": { "key": "value" } }`  the downloaded template
 *   `{ "secrets": [ { "key": …, "value": … } ] }`               array under a wrapper
 *   `[ { "key": …, "value": … } ]`                              bare array, hand-written
 */
function normalizeRoot(
  root: unknown
): { entries: RawEntry[]; provider?: string } | null {
  if (Array.isArray(root)) {
    return { entries: root.map(toRawEntry) };
  }

  if (typeof root !== 'object' || root === null) return null;

  const wrapper = root as Record<string, unknown>;
  const provider =
    typeof wrapper.provider === 'string' ? wrapper.provider.trim() : undefined;
  const secrets = wrapper.secrets;

  if (Array.isArray(secrets)) {
    return { entries: secrets.map(toRawEntry), provider };
  }

  if (typeof secrets === 'object' && secrets !== null) {
    const entries = Object.entries(secrets as Record<string, unknown>).map(
      ([key, value], index): RawEntry => ({ index, key, value })
    );
    return { entries, provider };
  }

  return null;
}

function toRawEntry(raw: unknown, index: number): RawEntry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { index, key: undefined, value: undefined };
  }
  const object = raw as Record<string, unknown>;
  return {
    index,
    key: object.key,
    value: object.value,
    provider: object.provider,
    description: object.description,
    extraProperties: Object.keys(object).filter(
      (name) => !KNOWN_ENTRY_PROPERTIES.has(name)
    ),
  };
}

/**
 * Validates one raw entry, returning either the accepted entry or the reason it was dropped.
 *
 * Mirrors the processor's own validation so a bad file is rejected before any round trip. The rules
 * that are not obvious:
 *   - an empty value is INVALID, not a no-op: `SetSecret(key, "")` deletes the record, so a blank
 *     value in a file would silently destroy a credential;
 *   - `key` and `provider` are trimmed, `value` never is - trailing whitespace can be significant
 *     in a password.
 */
function validateEntry(
  raw: RawEntry,
  fallbackProvider: string | undefined
):
  | { entry: BulkSecretEntry; warnings: SecretsFileIssue[] }
  | { issue: SecretsFileIssue } {
  const at = { index: raw.index };

  if (raw.key === undefined && raw.value === undefined) {
    return {
      issue: issue(
        'notAnObject',
        `Entry ${raw.index + 1} is not an object.`,
        at
      ),
    };
  }

  if (typeof raw.key !== 'string' || raw.key.trim() === '') {
    return {
      issue: issue('missingKey', `Entry ${raw.index + 1} has no key.`, at),
    };
  }
  const key = raw.key.trim();
  const named = { ...at, key };

  if (CONTROL_CHARS.test(key)) {
    return {
      issue: issue(
        'badKeyChars',
        `Key "${key}" contains control characters.`,
        named
      ),
    };
  }
  if (key.startsWith(RESERVED_KEY_PREFIX)) {
    return {
      issue: issue(
        'reservedKey',
        `Key "${key}" is reserved for internal use.`,
        named
      ),
    };
  }

  if (typeof raw.value !== 'string') {
    return {
      issue: issue(
        'missingValue',
        `"${key}" has no value, or its value is not text.`,
        named
      ),
    };
  }
  if (raw.value === '') {
    return {
      issue: issue(
        'emptyValue',
        `"${key}" has a blank value. Blank would delete the secret, so fill it in or remove the entry.`,
        named
      ),
    };
  }
  if (raw.value.length > MAX_SECRET_VALUE_LENGTH) {
    // Deliberately reports only the length, never any part of the value.
    return {
      issue: issue(
        'valueTooLong',
        `The value for "${key}" is ${raw.value.length} characters; the limit is ${MAX_SECRET_VALUE_LENGTH}.`,
        named
      ),
    };
  }

  let provider = fallbackProvider;
  if (raw.provider !== undefined) {
    if (typeof raw.provider !== 'string' || raw.provider.trim() === '') {
      return {
        issue: issue('badProvider', `"${key}" has an invalid provider.`, named),
      };
    }
    provider = raw.provider.trim();
  }

  if (raw.description !== undefined && typeof raw.description !== 'string') {
    return {
      issue: issue(
        'badDescription',
        `"${key}" has an invalid description.`,
        named
      ),
    };
  }

  const entry: BulkSecretEntry = { key, value: raw.value };
  if (provider) entry.provider = provider;
  if (typeof raw.description === 'string' && raw.description.trim() !== '') {
    entry.description = raw.description.trim();
  }

  const warnings: SecretsFileIssue[] = [];

  // Advisory, not a rejection: the processor accepts keys longer than the documented limit, and it
  // is the authority on what it will take. See DOCUMENTED_MAX_SECRET_KEY_LENGTH.
  if (key.length > DOCUMENTED_MAX_SECRET_KEY_LENGTH) {
    warnings.push(
      issue(
        'keyTooLong',
        `Key "${key}" is ${key.length} characters, longer than the documented limit of ${DOCUMENTED_MAX_SECRET_KEY_LENGTH}. The processor may reject it.`,
        named
      )
    );
  }

  if (raw.extraProperties && raw.extraProperties.length > 0) {
    warnings.push(
      issue(
        'unknownProperty',
        `"${key}" has unrecognized properties that were ignored: ${raw.extraProperties.join(', ')}.`,
        named
      )
    );
  }

  return { entry, warnings };
}

/**
 * Parses and validates a secrets file.
 *
 * Structural problems (1-6 in the order below) abort with `ok: false`. A per-entry problem drops
 * only that row: the valid entries still come back, with the failures reported as warnings, so a
 * user with one bad line out of thirty is not forced to start over.
 */
export function parseSecretsFile(input: ParseInput): ParseSecretsFileResult {
  const { text, fileName, fileSize } = input;

  // Ordered cheapest-first so a large binary is rejected without ever being parsed. Extension is
  // the assertion rather than MIME type, which is unreliable for a dropped file.
  if (!/\.json$/i.test(fileName.trim())) {
    return {
      ok: false,
      issues: [issue('notJson', `"${fileName}" is not a .json file.`)],
    };
  }

  if (fileSize > MAX_FILE_BYTES) {
    return {
      ok: false,
      issues: [
        issue(
          'tooLarge',
          `"${fileName}" is ${formatBytes(fileSize)}; the limit is ${formatBytes(MAX_FILE_BYTES)}.`
        ),
      ],
    };
  }

  if (text.trim() === '') {
    return { ok: false, issues: [issue('empty', 'The file is empty.')] };
  }

  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      issues: [issue('invalidJson', describeJsonSyntaxError(error, text))],
    };
  }

  const normalized = normalizeRoot(root);
  if (!normalized) {
    return {
      ok: false,
      issues: [
        issue(
          'badRootShape',
          'Expected a list of secrets, or an object with a "secrets" property.'
        ),
      ],
    };
  }

  if (normalized.entries.length > MAX_ENTRIES) {
    return {
      ok: false,
      issues: [
        issue(
          'tooManyEntries',
          `The file has ${normalized.entries.length} entries; the limit is ${MAX_ENTRIES}.`
        ),
      ],
    };
  }

  const entries: BulkSecretEntry[] = [];
  const warnings: SecretsFileIssue[] = [];
  const seen = new Set<string>();
  let blankValues = 0;

  for (const raw of normalized.entries) {
    const result = validateEntry(raw, normalized.provider);

    if ('issue' in result) {
      if (result.issue.code === 'emptyValue') blankValues += 1;
      warnings.push(result.issue);
      continue;
    }

    const identity = `${result.entry.provider ?? ''}\u0000${result.entry.key}`;
    if (seen.has(identity)) {
      // Last-write-wins is too surprising when the payload is a credential.
      warnings.push(
        issue('duplicate', `"${result.entry.key}" appears more than once.`, {
          index: raw.index,
          key: result.entry.key,
        })
      );
      continue;
    }
    seen.add(identity);

    entries.push(result.entry);
    warnings.push(...result.warnings);
  }

  // The overwhelmingly common mistake: downloading the template and uploading it unchanged.
  // Requires more than one entry - a single blank value is far more likely a typo than a template,
  // and the per-entry message already tells the user to fill it in.
  if (
    entries.length === 0 &&
    normalized.entries.length > 1 &&
    blankValues === normalized.entries.length
  ) {
    warnings.unshift(
      issue(
        'templateNotFilled',
        'Every value in this file is blank. This looks like a downloaded template - fill in the values before applying it.'
      )
    );
  }

  return {
    ok: true,
    entries,
    provider: normalized.provider,
    warnings,
    summary: summarizeSecretsFile(entries),
  };
}

/** Counts only - never values. */
export function summarizeSecretsFile(
  entries: BulkSecretEntry[]
): SecretsFileSummary {
  const byProvider: Record<string, number> = {};
  for (const entry of entries) {
    const provider = entry.provider ?? '';
    byProvider[provider] = (byProvider[provider] ?? 0) + 1;
  }
  return { total: entries.length, byProvider };
}
