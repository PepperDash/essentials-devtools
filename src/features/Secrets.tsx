import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';

import RefreshIcon from '../shared/components/RefreshIcon';
import useAppParams from '../shared/hooks/useAppParams';
import {
  downloadJson,
  timestampedFilename,
} from '../shared/functions/downloadFile';
import {
  useApplyBulkSecretsMutation,
  useGetPathsQuery,
  useGetSecretProvidersQuery,
  useGetSecretsQuery,
  useGetSecretsStorageQuery,
  useLazyGetSecretsTemplateQuery,
  useSendSecretCommandMutation,
} from '../store/apiSlice';
import { livePolling, POLL_INTERVALS_MS } from '../store/polling';
import {
  BulkSecretEntry,
  BulkSecretsResponse,
  bulkSecretsRequest,
  deleteSecretCommand,
  describeProviderStorage,
  describeSecretsError,
  hiddenRecordReason,
  isEncryptedRecord,
  maxValueLengthFor,
  programNumberFromAppId,
  SecretEntry,
  setSecretCommand,
  STORAGE_FULL_PERCENT,
  STORAGE_WARN_PERCENT,
  supportsSecretsApi,
} from '../store/secretsContract';
import BulkApplyModal from './secrets/BulkApplyModal';
import SecretDeleteModal from './secrets/SecretDeleteModal';
import SecretEditModal, {
  SecretEditSubmission,
  SecretEditTarget,
} from './secrets/SecretEditModal';

const DEFAULT_PROVIDER = 'default';

/**
 * Manage the credentials stored on the processor.
 *
 * Values are write-only throughout: the API never returns one, so this page can show which secrets
 * exist and replace them, but never reveal them.
 */
const Secrets = () => {
  const { appId } = useAppParams();

  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<SecretEditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SecretEntry | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const {
    data: apiPaths,
    isLoading: isProbing,
    isError: probeFailed,
    refetch: retryProbe,
  } = useGetPathsQuery(appId ? { appId } : skipToken);
  const canManageSecrets = useMemo(
    () => supportsSecretsApi(apiPaths?.routes),
    [apiPaths]
  );

  const { data: providerData } = useGetSecretProvidersQuery(
    appId && canManageSecrets ? { appId } : skipToken
  );
  // Other users, and other subsystems such as Mobile Control pairing, write to the store too
  const { data, isLoading, isError, refetch } = useGetSecretsQuery(
    appId && canManageSecrets ? { appId, provider } : skipToken,
    livePolling(POLL_INTERVALS_MS.secrets)
  );

  const [sendCommand, { isLoading: isSending, reset: resetCommand }] =
    useSendSecretCommandMutation();
  const [applyBulk, { reset: resetBulk }] = useApplyBulkSecretsMutation();
  const [fetchTemplate, { isFetching: isFetchingTemplate }] =
    useLazyGetSecretsTemplateQuery();

  // Older Essentials builds have no storage route; the usage line is then left out.
  const hasStorageRoute = useMemo(
    () =>
      (apiPaths?.routes ?? []).some((route) =>
        /(^|\/)secrets\/storage$/i.test(route.Url ?? '')
      ),
    [apiPaths]
  );
  const {
    data: storageData,
    refetch: refetchStorage,
    isFetching: isFetchingStorage,
  } = useGetSecretsStorageQuery(
    appId && canManageSecrets && hasStorageRoute ? { appId } : skipToken
  );

  const providers = providerData?.providers ?? [];
  const programName = providerData?.programName;
  // This program's own Data Store rows. Usage is kept per program name, so programs that share
  // the name share these figures.
  const ownUsage = (storageData?.usage ?? []).filter(
    (row) => !programName || row.owner === programName
  );
  const selectedProvider = providers.find(
    (item) => item.key.toLowerCase() === provider.toLowerCase()
  );
  const secrets = useMemo(() => data?.secrets ?? [], [data]);

  const { managed, unmanaged } = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matches = (entry: SecretEntry) =>
      !needle ||
      entry.key.toLowerCase().includes(needle) ||
      (entry.description ?? '').toLowerCase().includes(needle);
    const shown = secrets.filter(matches);
    return {
      managed: shown.filter((s) => s.managed),
      // The processor lists every program's local records. Leave out the encrypted provider's
      // records (listed there by key) and other programs' records (unreadable from here).
      unmanaged: shown.filter(
        (s) =>
          !s.managed &&
          hiddenRecordReason(s, programName, programNumberFromAppId(appId)) ===
            null
      ),
    };
  }, [secrets, filter, programName, appId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleEditSubmit = async (submission: SecretEditSubmission) => {
    if (!appId) return;
    setCommandError(null);
    try {
      await sendCommand({
        appId,
        request: setSecretCommand(
          submission.provider,
          submission.key,
          submission.value,
          {
            description: submission.description,
            overwrite: submission.overwrite,
          }
        ),
      }).unwrap();
      setEditing(null);
    } catch (error) {
      setCommandError(describeSecretsError(error));
    } finally {
      // Purges the mutation cache entry, and with it the plaintext value RTK Query keeps in
      // originalArgs where Redux DevTools can read it.
      resetCommand();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!appId || !pendingDelete) return;
    setCommandError(null);
    try {
      await sendCommand({
        appId,
        request: deleteSecretCommand(provider, pendingDelete.key),
      }).unwrap();
      setPendingDelete(null);
    } catch (error) {
      setCommandError(describeSecretsError(error));
    } finally {
      resetCommand();
    }
  };

  const handleBulkRun = async (
    entries: BulkSecretEntry[],
    options: {
      mode: 'preview' | 'commit';
      overwrite: boolean;
      allowUnmanagedOverwrite: boolean;
    }
  ): Promise<BulkSecretsResponse> => {
    if (!appId) throw new Error('No application selected.');
    try {
      return await applyBulk({
        appId,
        request: bulkSecretsRequest(provider, entries, options),
      }).unwrap();
    } catch (error) {
      throw new Error(describeSecretsError(error), { cause: error });
    } finally {
      resetBulk();
    }
  };

  const handleDownloadTemplate = async () => {
    if (!appId) return;
    setCommandError(null);
    try {
      const template = await fetchTemplate({ appId, provider }).unwrap();
      downloadJson(
        timestampedFilename(`secrets-template-${appId}-${provider}`, 'json'),
        template
      );
    } catch (error) {
      setCommandError(describeSecretsError(error));
    }
  };

  // ── Render gates ──────────────────────────────────────────────────────────

  if (isProbing || (canManageSecrets && isLoading)) {
    return <div className="p-3">Loading secrets…</div>;
  }

  // "Could not ask" and "asked, and it is not supported" are different problems with different
  // fixes. Collapsing them would tell someone to upgrade Essentials over a dropped request.
  if (probeFailed) {
    return (
      <div className="p-3">
        <div className="text-danger mb-2">
          Could not check whether this processor supports secrets management.
        </div>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={() => void retryProbe()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!canManageSecrets) {
    return (
      <div className="p-3 text-danger">
        Secrets management is not available on this processor. It requires a
        newer Essentials version.
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-3">
        <div className="text-danger mb-2">Failed to load secrets.</div>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const renderRows = (entries: SecretEntry[], showActions: boolean) =>
    entries.map((entry) => (
      <tr key={entry.key}>
        <td className="text-break">{entry.key}</td>
        <td className="small text-muted">{entry.description}</td>
        <td className="small text-muted d-none d-md-table-cell">
          {entry.updatedUtc ?? entry.lastModifiedUtc ?? ''}
        </td>
        <td className="d-flex flex-wrap justify-content-end gap-1">
          {showActions && (
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => setEditing({ mode: 'update', entry })}
            >
              Replace value
            </Button>
          )}
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => {
              setCommandError(null);
              setPendingDelete(entry);
            }}
          >
            Delete
          </Button>
        </td>
      </tr>
    ));

  return (
    <div className="d-flex flex-column overflow-hidden h-100 gap-3 p-1 p-md-3 page-scroll-sm">
      <div>
        <h2 className="mb-1">Secrets</h2>
        <p className="text-muted small mb-0">
          Credentials stored on the processor, referenced from device configs as{' '}
          <code>{'{"secret": {"provider": "…", "key": "…"}}'}</code>.
        </p>
      </div>

      <div className="alert alert-secondary py-2 px-3 small mb-0" role="note">
        Stored values are never readable, here or anywhere else. Replacing a
        secret means entering the new value in full; a forgotten credential
        cannot be recovered.
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <Form.Select
          size="sm"
          style={{ width: 'auto' }}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label="Secret provider"
        >
          {(providers.length > 0
            ? providers
            : [{ key: DEFAULT_PROVIDER, scope: 'local' as const }]
          ).map((item) => (
            <option key={item.key} value={item.key}>
              {item.key} (
              {describeProviderStorage(item, appId, programName).option})
            </option>
          ))}
        </Form.Select>

        <Form.Control
          size="sm"
          type="search"
          style={{ width: 'auto' }}
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter secrets"
        />

        <div className="ms-auto d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => void handleDownloadTemplate()}
            disabled={isFetchingTemplate}
          >
            {isFetchingTemplate ? 'Preparing…' : 'Download template'}
          </Button>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => setShowBulk(true)}
          >
            Apply file…
          </Button>
        </div>
      </div>

      {selectedProvider && (
        <div className="small text-muted" data-testid="provider-storage">
          {
            describeProviderStorage(selectedProvider, appId, programName)
              .summary
          }
        </div>
      )}

      {ownUsage.length > 0 && (
        <div className="small" data-testid="storage-usage">
          <span className="text-muted">Data Store use: </span>
          {ownUsage.map((row, index) => (
            <span key={row.store}>
              {index > 0 && ', '}
              <span
                className={
                  row.percentUsed >= STORAGE_FULL_PERCENT
                    ? 'text-danger fw-bold'
                    : row.percentUsed >= STORAGE_WARN_PERCENT
                      ? 'text-warning-emphasis fw-bold'
                      : 'text-muted'
                }
              >
                {row.percentUsed}% ({row.store})
              </span>
            </span>
          ))}
          {ownUsage.some((row) => row.percentUsed >= STORAGE_FULL_PERCENT) && (
            <span className="text-danger">
              {' '}
              Over the processor&apos;s quota; delete secrets before adding
              more.
            </span>
          )}
          <Button
            variant="link"
            size="sm"
            className="p-0 ms-2 align-baseline"
            onClick={() => void refetchStorage()}
            disabled={isFetchingStorage}
            aria-label="Refresh Data Store use"
            title="Refresh Data Store use"
          >
            <RefreshIcon />
          </Button>
        </div>
      )}

      {data.indexStatus && data.indexStatus !== 'ok' && (
        <div className="alert alert-warning py-2 px-3 small mb-0" role="alert">
          The record of which secrets were created here is{' '}
          {data.indexStatus === 'missing' ? 'missing' : 'damaged'}, so
          everything below is listed as unmanaged. The secrets themselves are
          unaffected and still work.
        </div>
      )}

      {data.enumerationComplete === false && (
        <div className="alert alert-warning py-2 px-3 small mb-0" role="alert">
          The processor could not list every record, so this page may be
          incomplete.
        </div>
      )}

      {commandError && (
        <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
          {commandError}
        </div>
      )}

      <div className="overflow-auto flex-grow-1 pane-scroll-sm">
        <h5 className="mb-2">Managed secrets</h5>
        <table className="table table-striped table-bordered">
          <thead className="table-light sticky-top">
            <tr>
              <th>Key</th>
              <th>Description</th>
              <th className="d-none d-md-table-cell">Updated</th>
              <th className="text-end">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => {
                    setCommandError(null);
                    setEditing({ mode: 'add' });
                  }}
                >
                  Add +
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {managed.length > 0 ? (
              renderRows(managed, true)
            ) : (
              <tr>
                <td colSpan={4} className="text-muted small">
                  {filter
                    ? 'No secrets match the filter.'
                    : 'No secrets stored here yet. Add one, or apply a file.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {unmanaged.length > 0 && (
          <>
            <h5 className="mb-1 mt-4">Other data store records</h5>
            <p className="text-muted small">
              These exist on the processor but were not created here. Some
              belong to other parts of the system — Mobile Control keeps its
              paired-client tokens this way — so deleting one can break
              something unrelated.
            </p>
            <table className="table table-striped table-bordered">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Key</th>
                  <th>Owner</th>
                  <th className="d-none d-md-table-cell">Modified</th>
                  <th className="text-end">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {unmanaged.map((entry) => (
                  <tr key={entry.key}>
                    <td className="text-break">
                      {entry.key}{' '}
                      {isEncryptedRecord(entry) ? (
                        <span className="badge text-bg-info">
                          Encrypted, managed under CrestronSecureSecrets
                        </span>
                      ) : (
                        <span className="badge text-bg-secondary">
                          Not managed here
                        </span>
                      )}
                    </td>
                    <td className="small text-muted">{entry.owner}</td>
                    <td className="small text-muted d-none d-md-table-cell">
                      {entry.lastModifiedUtc}
                    </td>
                    <td className="d-flex justify-content-end">
                      {/* Deleting an encrypted record here would bypass its provider's key list. */}
                      {!isEncryptedRecord(entry) && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => {
                            setCommandError(null);
                            setPendingDelete(entry);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {editing && (
        <SecretEditModal
          // Remount, and so re-seed the form, when pointed at a different secret or provider
          key={`${provider}\u0000${editing.mode === 'update' ? editing.entry.key : ''}`}
          target={editing}
          provider={provider}
          providers={providers}
          appId={appId}
          existingKeys={secrets}
          isSaving={isSending}
          errorMessage={commandError}
          onSubmit={(submission) => void handleEditSubmit(submission)}
          onClose={() => {
            setEditing(null);
            setCommandError(null);
          }}
        />
      )}

      {pendingDelete && (
        <SecretDeleteModal
          entry={pendingDelete}
          provider={provider}
          isDeleting={isSending}
          errorMessage={commandError}
          onConfirm={() => void handleDeleteConfirm()}
          onClose={() => {
            setPendingDelete(null);
            setCommandError(null);
          }}
        />
      )}

      {showBulk && (
        <BulkApplyModal
          provider={provider}
          maxValueLength={maxValueLengthFor(providers, provider)}
          onRun={handleBulkRun}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
};

export default Secrets;
