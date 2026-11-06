/**
 * The wire contract for the Essentials secrets API.
 *
 * Owned on the C# side by PepperDash.Essentials.Core/Web/SecretsApiContracts.cs and the five
 * Secrets*RequestHandler classes. Everything the backend shape touches lives in this one file, so a
 * rename over there is a single-file edit here rather than a hunt through components.
 *
 * Two invariants hold across every endpoint:
 *
 *   1. **No response ever carries a secret value.** The processor is write-only for values - a
 *      forgotten credential must be re-entered, never recovered. None of the response types below
 *      have a value field, and that is deliberate rather than incidental.
 *   2. **Mutations are POST, never DELETE.** WebApiBaseRequestHandler advertises only
 *      `POST, GET, OPTIONS` and its HandleOptions returns 501, so a cross-origin DELETE fails
 *      preflight. Deletion is `secrets/command` with `action: "delete"`.
 */

// ─── Endpoint paths ──────────────────────────────────────────────────────────
// Appended after `/{appId}/api/`. SECRETS_PATH is also what the capability probe looks for.

export const SECRETS_PATH = 'secrets';
export const SECRETS_PROVIDERS_PATH = 'secrets/providers';
export const SECRETS_COMMAND_PATH = 'secrets/command';
export const SECRETS_BULK_PATH = 'secrets/bulk';
export const SECRETS_TEMPLATE_PATH = 'secrets/template';

// ─── Crestron Data Store limits ──────────────────────────────────────────────

/**
 * The key length the Crestron SDK documents for CDS_NAME_TOO_BIG.
 *
 * ADVISORY, NOT ENFORCED. Records with longer names demonstrably exist - Mobile Control's
 * `7:mobileControl-directServer-tokens` is 35 characters and was written through the same store
 * API. Treating 32 as a hard limit would refuse keys the processor accepts, and would make an
 * existing record impossible to delete. The processor is the authority: it reports `keyTooLong` if
 * it actually objects. Use this to warn, never to block.
 */
export const DOCUMENTED_MAX_SECRET_KEY_LENGTH = 32;

/**
 * Value length cap from CDS_STRING_TOO_BIG. The fallback for a provider that does not report its
 * own `maxValueLength`; see {@link maxValueLengthFor}.
 */
export const MAX_SECRET_VALUE_LENGTH = 1600;

/** Records the API uses for its own bookkeeping. Never writable, never listed by default. */
export const RESERVED_KEY_PREFIX = '__essSecretsIdx';

// ─── Providers ───────────────────────────────────────────────────────────────

/**
 * Which storage space a provider writes to: this program's own (`local`, which includes the
 * encrypted secure-storage provider) or one shared by every program (`global`).
 */
export type SecretStoreScope = 'local' | 'global';

export interface SecretProviderInfo {
  key: string;
  description?: string;
  scope: SecretStoreScope;
  /** False for a provider that cannot enumerate; its secrets can be written but not listed. */
  enumerationSupported: boolean;
  maxKeyLength: number;
  maxValueLength: number;
  /** Whether values are encrypted at rest. Absent from Essentials builds older than #1552. */
  encrypted?: boolean;
  /** Most characters the provider stores in total, when it sets a total. */
  maxTotalLength?: number;
  /** Most secrets the provider holds, when it sets a count. */
  maxSecrets?: number;
}

/**
 * Plain-language facts about a provider: whether it encrypts, who shares its keys, and its limits.
 *
 * `option` is a short suffix for the provider picker; `summary` is the sentence shown under it.
 * Each statement was checked on a processor (RMC4, firmware 2.8006.00110):
 *   - the Data Store keeps local records per program NAME, so programs with the same name (two
 *     Essentials programs) share the `default` provider's keys;
 *   - the encrypted provider stores each secret under the program number as well, so each
 *     program keeps its own;
 *   - global records can be read by every program.
 * A statement is left out when the processor does not report what it needs.
 */
export function describeProviderStorage(
  provider: Pick<SecretProviderInfo, 'scope' | 'encrypted'> &
    Partial<
      Pick<
        SecretProviderInfo,
        'maxValueLength' | 'maxTotalLength' | 'maxSecrets'
      >
    >,
  appId: string | undefined,
  programName?: string
): { option: string; summary: string } {
  const parts: string[] = [];
  let option: string;

  if (provider.scope === 'global') {
    option = 'all programs';
    if (provider.encrypted === false) parts.push('Not encrypted.');
    parts.push('Every program on this processor can read these.');
  } else if (provider.encrypted === true) {
    option = appId ? `encrypted, ${appId}` : 'encrypted';
    parts.push(appId ? `Encrypted. Stored for ${appId}.` : 'Encrypted.');
  } else {
    option = provider.encrypted === false ? 'not encrypted' : 'this program';
    if (provider.encrypted === false) parts.push('Not encrypted.');
    if (programName) {
      parts.push(
        `Shared with other programs named ${programName} on this processor.`
      );
    }
  }

  const limits: string[] = [];
  if (provider.maxValueLength) {
    limits.push(
      `up to ${provider.maxValueLength.toLocaleString('en-US')} characters per secret`
    );
  }
  if (provider.maxTotalLength) {
    limits.push(`${provider.maxTotalLength.toLocaleString('en-US')} in total`);
  }
  if (provider.maxSecrets) {
    limits.push(`${provider.maxSecrets} secrets`);
  }
  if (limits.length > 0) {
    const text = limits.join(', ');
    parts.push(text.charAt(0).toUpperCase() + text.slice(1) + '.');
  }

  return { option, summary: parts.join(' ') };
}

/**
 * Why a listed record is left off this program's page, or null when it belongs on it.
 *
 * The processor's listing returns every program's local records, not just this one's. Kept:
 * records with no program number (shared by programs with this name) and records carrying this
 * program's number. Left out:
 *   - `otherApp`: a record carrying another program's number, e.g. `Local_SecureStorage_2:…` or
 *     Mobile Control's `2:…-tokens`, seen from program 1;
 *   - `internal`: the encrypted provider's bookkeeping (its index and key list), hidden like the
 *     Secrets API's own `__essSecretsIdx…` records;
 *   - `otherProgram`: owned by a program with a different name, which this program can neither
 *     read nor delete (checked on an RMC4).
 */
export function hiddenRecordReason(
  entry: Pick<SecretEntry, 'key' | 'owner'>,
  programName: string | undefined,
  programNumber: number | undefined
): 'otherApp' | 'internal' | 'otherProgram' | null {
  if (programName && entry.owner && entry.owner !== programName) {
    return 'otherProgram';
  }

  const rest = entry.key.startsWith(SECURE_STORAGE_RECORD_PREFIX)
    ? entry.key.slice(SECURE_STORAGE_RECORD_PREFIX.length)
    : entry.key;
  const numbered = /^(\d+):(.*)$/.exec(rest);
  if (
    numbered &&
    programNumber !== undefined &&
    Number(numbered[1]) !== programNumber
  ) {
    return 'otherApp';
  }

  const tag = numbered ? numbered[2] : rest;
  if (
    entry.key.startsWith(SECURE_STORAGE_RECORD_PREFIX) &&
    tag.startsWith(RESERVED_KEY_PREFIX)
  ) {
    return 'internal';
  }

  return null;
}

/** True for a record that holds one of the encrypted provider's values. */
export function isEncryptedRecord(entry: Pick<SecretEntry, 'key'>): boolean {
  return entry.key.startsWith(SECURE_STORAGE_RECORD_PREFIX);
}

/** The program number in an app id such as "app01", or undefined. */
export function programNumberFromAppId(
  appId: string | undefined
): number | undefined {
  const match = /^app0*(\d+)$/i.exec(appId ?? '');
  return match ? Number(match[1]) : undefined;
}

/** Prefix Crestron gives the Data Store records that hold local secure-storage values. */
export const SECURE_STORAGE_RECORD_PREFIX = 'Local_SecureStorage_';

export interface SecretsProvidersResponse {
  providers: SecretProviderInfo[];
  /**
   * This program's name. The Data Store keeps local records, and each record's owner, per program
   * name, so programs with the same name share them.
   */
  programName?: string;
}

// ─── Storage usage ───────────────────────────────────────────────────────────

export const SECRETS_STORAGE_PATH = 'secrets/storage';

/** One program name's use of one Data Store space, from the processor's DATASTORESTATUS. */
export interface DataStoreUsage {
  store: 'local' | 'global';
  owner: string;
  records: number;
  bytes: number;
  /** As the processor reports it; can exceed 100, which the processor does not prevent. */
  percentUsed: number;
}

export interface SecretsStorageResponse {
  programName?: string;
  available: boolean;
  usage: DataStoreUsage[];
  error?: SecretsApiError;
}

/** Percent at which usage is shown as a warning, and at which it is over the quota. */
export const STORAGE_WARN_PERCENT = 80;
export const STORAGE_FULL_PERCENT = 100;

/**
 * The longest value a provider accepts, from its own `maxValueLength`.
 *
 * Providers differ: the Data Store ones take 1600 characters, the encrypted secure-storage one
 * takes more (a PEM private key). Falls back to the Data Store limit for an unknown provider, or
 * one that does not report a usable figure. The processor is still the authority and refuses
 * anything it won't store.
 */
export function maxValueLengthFor(
  providers: readonly SecretProviderInfo[],
  providerKey: string | undefined
): number {
  const match = providers.find(
    (item) => item.key.toLowerCase() === (providerKey ?? '').toLowerCase()
  );
  const reported = match?.maxValueLength;
  return typeof reported === 'number' &&
    Number.isFinite(reported) &&
    reported > 0
    ? reported
    : MAX_SECRET_VALUE_LENGTH;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

/**
 * Health of the sidecar index that records which keys this API manages.
 *
 * The index is advisory: it classifies records, it does not store them. "missing" or any
 * "corrupt:*" value means every key is reported unmanaged, which is a degraded display - never a
 * broken system, and never a reason to block writes.
 */
export type SecretsIndexStatus = 'ok' | 'missing' | `corrupt:${string}`;

export interface SecretEntry {
  key: string;
  /** True when the sidecar index knows about this key - i.e. it was written through this API. */
  managed: boolean;
  description?: string;
  createdUtc?: string;
  updatedUtc?: string;
  /** Last-modified straight from the Data Store record, independent of the index. */
  lastModifiedUtc?: string;
  /** Creating application. Relevant in the global scope, which is shared across program slots. */
  owner?: string;
  /** True for a key the index lists that no longer exists in the store. */
  stale?: boolean;
  /** True for the API's own index records; only present when explicitly requested. */
  reserved?: boolean;
}

export interface StaleIndexEntry {
  key: string;
  description?: string;
  createdUtc?: string;
}

export interface SecretsCounts {
  total: number;
  managed: number;
  unmanaged: number;
  stale: number;
}

export interface SecretsListResponse {
  provider: string;
  scope: SecretStoreScope;
  indexStatus: SecretsIndexStatus;
  /**
   * False when the Data Store walk was cut short. The list is then incomplete, and the processor
   * refuses to prune the index - pruning on a partial view would delete live entries.
   */
  enumerationComplete: boolean;
  counts: SecretsCounts;
  secrets: SecretEntry[];
  staleIndexEntries?: StaleIndexEntry[];
  warnings?: string[];
  /** Present when the provider cannot enumerate, explaining why the list is empty. */
  notice?: string;
}

// ─── Single-secret commands ──────────────────────────────────────────────────

export type SecretCommandAction =
  'set' | 'update' | 'delete' | 'test' | 'pruneIndex' | 'rebuildIndex';

export interface SecretCommandRequest {
  action: SecretCommandAction;
  provider: string;
  key?: string;
  value?: string;
  description?: string;
  /** `set` only: replace an existing key instead of failing with `alreadyExists`. */
  overwrite?: boolean;
  /** `rebuildIndex` only: adopt these existing keys as managed WITHOUT touching their values. */
  adoptKeys?: string[];
}

export interface SecretCommandResponse {
  status: 'ok' | 'error';
  action?: SecretCommandAction;
  provider?: string;
  key?: string;
  existedBefore?: boolean;
  /** `test` only. */
  exists?: boolean;
  /** False when the secret was written but the index could not be updated - not a failure. */
  indexUpdated?: boolean;
  /** `rebuildIndex` only. */
  entriesRetained?: number;
  warning?: string;
  error?: SecretsApiError;
}

// ─── Bulk apply ──────────────────────────────────────────────────────────────

export interface BulkSecretEntry {
  key: string;
  value: string;
  /** Falls back to the request's top-level provider when omitted. */
  provider?: string;
  description?: string;
}

export interface BulkSecretsRequest {
  /** "preview" validates and reports without writing anything. */
  mode: 'preview' | 'commit';
  provider: string;
  overwrite: boolean;
  /** Permit writing over a key the index does not manage (e.g. another subsystem's record). */
  allowUnmanagedOverwrite?: boolean;
  secrets: BulkSecretEntry[];
}

export type BulkSecretAction =
  'create' | 'overwrite' | 'skip' | 'invalid' | 'failed';

export interface BulkEntryResult {
  index: number;
  key: string;
  provider: string;
  action: BulkSecretAction;
  /** Machine-readable cause for `skip`, `invalid` and `failed`. */
  reason?: string;
  message?: string;
  /** Always false in preview mode. */
  applied: boolean;
}

export interface BulkSummary {
  total: number;
  create: number;
  overwrite: number;
  skip: number;
  invalid: number;
  failed: number;
}

export interface BulkSecretsResponse {
  mode: 'preview' | 'commit';
  provider: string;
  overwrite: boolean;
  summary: BulkSummary;
  entries: BulkEntryResult[];
  indexUpdated?: boolean;
  warnings?: string[];
  error?: SecretsApiError;
}

// ─── Template ────────────────────────────────────────────────────────────────

export interface SecretsTemplateMetadata {
  key: string;
  provider: string;
  description?: string;
  managed: boolean;
}

export interface SecretsTemplateResponse {
  provider: string;
  generatedUtc: string;
  note?: string;
  /** Flat key → "" map. Fill in the values and send it back to the bulk endpoint. */
  secrets: Record<string, string>;
  metadata?: SecretsTemplateMetadata[];
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Stable codes. The status code says how to react: 400 means the request is malformed, 404 that a
 * key or provider is wrong, 409 that the store's current state forbids it, 403/507/503 that the
 * Data Store itself refused.
 */
export type SecretsApiErrorCode =
  | 'invalidJson'
  | 'missingField'
  | 'unknownAction'
  | 'providerNotFound'
  | 'emptyKey'
  | 'invalidKey'
  | 'keyTooLong'
  | 'reservedKey'
  | 'emptyValue'
  | 'valueTooLong'
  | 'alreadyExists'
  | 'notFound'
  | 'accessDenied'
  | 'storeFull'
  | 'storeUnavailable'
  | 'batchTooLarge'
  | 'enumerationIncomplete'
  | 'indexFull'
  | 'executionError';

export interface SecretsApiError {
  code: SecretsApiErrorCode;
  message: string;
  field?: string;
}

// ─── Builders ────────────────────────────────────────────────────────────────

export function setSecretCommand(
  provider: string,
  key: string,
  value: string,
  options: { description?: string; overwrite?: boolean } = {}
): SecretCommandRequest {
  const request: SecretCommandRequest = { action: 'set', provider, key, value };
  if (options.description) request.description = options.description;
  if (options.overwrite) request.overwrite = true;
  return request;
}

export function updateSecretCommand(
  provider: string,
  key: string,
  value: string,
  description?: string
): SecretCommandRequest {
  const request: SecretCommandRequest = {
    action: 'update',
    provider,
    key,
    value,
  };
  if (description) request.description = description;
  return request;
}

export function deleteSecretCommand(
  provider: string,
  key: string
): SecretCommandRequest {
  return { action: 'delete', provider, key };
}

export function testSecretCommand(
  provider: string,
  key: string
): SecretCommandRequest {
  return { action: 'test', provider, key };
}

export function pruneIndexCommand(provider: string): SecretCommandRequest {
  return { action: 'pruneIndex', provider };
}

export function rebuildIndexCommand(
  provider: string,
  adoptKeys?: string[]
): SecretCommandRequest {
  const request: SecretCommandRequest = { action: 'rebuildIndex', provider };
  if (adoptKeys && adoptKeys.length > 0) request.adoptKeys = adoptKeys;
  return request;
}

export function bulkSecretsRequest(
  provider: string,
  secrets: BulkSecretEntry[],
  options: {
    mode: 'preview' | 'commit';
    overwrite: boolean;
    allowUnmanagedOverwrite?: boolean;
  }
): BulkSecretsRequest {
  const request: BulkSecretsRequest = {
    mode: options.mode,
    provider,
    overwrite: options.overwrite,
    secrets,
  };
  if (options.allowUnmanagedOverwrite) request.allowUnmanagedOverwrite = true;
  return request;
}

// ─── Capability detection ────────────────────────────────────────────────────

/**
 * True when the processor exposes the secrets API, detected from its live CWS route table rather
 * than from a version number.
 *
 * Matches a whole path segment: "secrets" is a common enough token that `/api/mysecretsthing`
 * would otherwise read as support.
 */
export function supportsSecretsApi(routes?: { Url?: string }[]): boolean {
  if (!routes) return false;
  return routes.some((route) => /(^|\/)secrets(\/|$)/i.test(route.Url ?? ''));
}

// ─── Error rendering ─────────────────────────────────────────────────────────

/**
 * Turns whatever RTK Query surfaced into a sentence safe to render.
 *
 * SECURITY: this must only ever read from the RESPONSE body. `axiosBaseQuery` surfaces
 * `error.response?.data` and never `error.config.data`, so there is no path by which a submitted
 * secret value could be echoed back into the DOM - do not add one.
 */
export function describeSecretsError(error: unknown): string {
  const data = (error as { data?: { error?: SecretsApiError } })?.data;
  if (data?.error?.message) return data.error.message;

  const status = (error as { status?: number | string })?.status;
  if (status === 'FETCH_ERROR' || status === undefined) {
    return 'Could not reach the processor.';
  }
  return `Secrets request failed (${status}).`;
}
