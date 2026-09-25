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

/** Value length cap from CDS_STRING_TOO_BIG. No counter-evidence, so still enforced client-side. */
export const MAX_SECRET_VALUE_LENGTH = 1600;

/** Records the API uses for its own bookkeeping. Never writable, never listed by default. */
export const RESERVED_KEY_PREFIX = '__essSecretsIdx';

// ─── Providers ───────────────────────────────────────────────────────────────

/** Which Crestron Data Store space a provider writes to. */
export type SecretStoreScope = 'local' | 'global';

export interface SecretProviderInfo {
  key: string;
  description?: string;
  scope: SecretStoreScope;
  /** False for a provider that cannot enumerate; its secrets can be written but not listed. */
  enumerationSupported: boolean;
  maxKeyLength: number;
  maxValueLength: number;
}

export interface SecretsProvidersResponse {
  providers: SecretProviderInfo[];
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
