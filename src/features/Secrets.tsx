import { skipToken } from "@reduxjs/toolkit/query";
import { useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";

import useAppParams from "../shared/hooks/useAppParams";
import { downloadJson, timestampedFilename } from "../shared/functions/downloadFile";
import {
  useApplyBulkSecretsMutation,
  useGetPathsQuery,
  useGetSecretProvidersQuery,
  useGetSecretsQuery,
  useLazyGetSecretsTemplateQuery,
  useSendSecretCommandMutation,
} from "../store/apiSlice";
import {
  BulkSecretEntry,
  BulkSecretsResponse,
  bulkSecretsRequest,
  deleteSecretCommand,
  describeSecretsError,
  SecretEntry,
  setSecretCommand,
  supportsSecretsApi,
} from "../store/secretsContract";
import BulkApplyModal from "./secrets/BulkApplyModal";
import SecretDeleteModal from "./secrets/SecretDeleteModal";
import SecretEditModal, { SecretEditSubmission, SecretEditTarget } from "./secrets/SecretEditModal";

const DEFAULT_PROVIDER = "default";

/**
 * Manage the credentials stored on the processor.
 *
 * Values are write-only throughout: the API never returns one, so this page can show which secrets
 * exist and replace them, but never reveal them.
 */
const Secrets = () => {
  const { appId } = useAppParams();

  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [filter, setFilter] = useState("");
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
    [apiPaths],
  );

  const { data: providerData } = useGetSecretProvidersQuery(
    appId && canManageSecrets ? { appId } : skipToken,
  );
  const { data, isLoading, isError, refetch } = useGetSecretsQuery(
    appId && canManageSecrets ? { appId, provider } : skipToken,
  );

  const [sendCommand, { isLoading: isSending, reset: resetCommand }] =
    useSendSecretCommandMutation();
  const [applyBulk, { reset: resetBulk }] = useApplyBulkSecretsMutation();
  const [fetchTemplate, { isFetching: isFetchingTemplate }] = useLazyGetSecretsTemplateQuery();

  const providers = providerData?.providers ?? [];
  const secrets = data?.secrets ?? [];

  const matches = (entry: SecretEntry) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return (
      entry.key.toLowerCase().includes(needle) ||
      (entry.description ?? "").toLowerCase().includes(needle)
    );
  };

  const managed = useMemo(() => secrets.filter((s) => s.managed && matches(s)), [secrets, filter]);
  const unmanaged = useMemo(
    () => secrets.filter((s) => !s.managed && matches(s)),
    [secrets, filter],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleEditSubmit = async (submission: SecretEditSubmission) => {
    if (!appId) return;
    setCommandError(null);
    try {
      await sendCommand({
        appId,
        request: setSecretCommand(submission.provider, submission.key, submission.value, {
          description: submission.description,
          overwrite: submission.overwrite,
        }),
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
    options: { mode: "preview" | "commit"; overwrite: boolean; allowUnmanagedOverwrite: boolean },
  ): Promise<BulkSecretsResponse> => {
    if (!appId) throw new Error("No application selected.");
    try {
      return await applyBulk({
        appId,
        request: bulkSecretsRequest(provider, entries, options),
      }).unwrap();
    } catch (error) {
      throw new Error(describeSecretsError(error));
    } finally {
      resetBulk();
    }
  };

  const handleDownloadTemplate = async () => {
    if (!appId) return;
    setCommandError(null);
    try {
      const template = await fetchTemplate({ appId, provider }).unwrap();
      downloadJson(timestampedFilename(`secrets-template-${appId}-${provider}`, "json"), template);
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
        <Button size="sm" variant="outline-secondary" onClick={() => retryProbe()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!canManageSecrets) {
    return (
      <div className="p-3 text-danger">
        Secrets management is not available on this processor. It requires a newer Essentials
        version.
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-3">
        <div className="text-danger mb-2">Failed to load secrets.</div>
        <Button size="sm" variant="outline-secondary" onClick={() => refetch()}>
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
        <td className="small text-muted">
          {entry.updatedUtc ?? entry.lastModifiedUtc ?? ""}
        </td>
        <td className="d-flex justify-content-end gap-1">
          {showActions && (
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => setEditing({ mode: "update", entry })}
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
    <div className="d-flex flex-column overflow-hidden h-100 gap-3 p-3">
      <div>
        <h2 className="mb-1">Secrets</h2>
        <p className="text-muted small mb-0">
          Credentials stored on the processor, referenced from device configs as{" "}
          <code>{'{"secret": {"provider": "…", "key": "…"}}'}</code>.
        </p>
      </div>

      <div className="alert alert-secondary py-2 px-3 small mb-0" role="note">
        Stored values are never readable, here or anywhere else. Replacing a secret means entering
        the new value in full; a forgotten credential cannot be recovered.
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <Form.Select
          size="sm"
          style={{ width: "auto" }}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label="Secret provider"
        >
          {(providers.length > 0 ? providers : [{ key: DEFAULT_PROVIDER, scope: "local" }]).map(
            (item) => (
              <option key={item.key} value={item.key}>
                {item.key}
                {item.scope === "global" ? " (shared across programs)" : ""}
              </option>
            ),
          )}
        </Form.Select>

        <Form.Control
          size="sm"
          type="search"
          style={{ width: "auto" }}
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter secrets"
        />

        <div className="ms-auto d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={handleDownloadTemplate}
            disabled={isFetchingTemplate}
          >
            {isFetchingTemplate ? "Preparing…" : "Download template"}
          </Button>
          <Button size="sm" variant="outline-primary" onClick={() => setShowBulk(true)}>
            Apply file…
          </Button>
        </div>
      </div>

      {data.indexStatus && data.indexStatus !== "ok" && (
        <div className="alert alert-warning py-2 px-3 small mb-0" role="alert">
          The record of which secrets were created here is{" "}
          {data.indexStatus === "missing" ? "missing" : "damaged"}, so everything below is listed as
          unmanaged. The secrets themselves are unaffected and still work.
        </div>
      )}

      {data.enumerationComplete === false && (
        <div className="alert alert-warning py-2 px-3 small mb-0" role="alert">
          The processor could not list every record, so this page may be incomplete.
        </div>
      )}

      {commandError && (
        <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
          {commandError}
        </div>
      )}

      <div className="overflow-auto flex-grow-1">
        <h5 className="mb-2">Managed secrets</h5>
        <table className="table table-striped table-bordered">
          <thead className="table-light sticky-top">
            <tr>
              <th>Key</th>
              <th>Description</th>
              <th>Updated</th>
              <th className="text-end">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => {
                    setCommandError(null);
                    setEditing({ mode: "add" });
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
                    ? "No secrets match the filter."
                    : "No secrets stored here yet. Add one, or apply a file."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {unmanaged.length > 0 && (
          <>
            <h5 className="mb-1 mt-4">Other data store records</h5>
            <p className="text-muted small">
              These exist on the processor but were not created here. Some belong to other parts of
              the system — Mobile Control keeps its paired-client tokens this way — so deleting one
              can break something unrelated.
            </p>
            <table className="table table-striped table-bordered">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Key</th>
                  <th>Owner</th>
                  <th>Modified</th>
                  <th className="text-end">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {unmanaged.map((entry) => (
                  <tr key={entry.key}>
                    <td className="text-break">
                      {entry.key}{" "}
                      <span className="badge text-bg-secondary">Not managed here</span>
                    </td>
                    <td className="small text-muted">{entry.owner}</td>
                    <td className="small text-muted">{entry.lastModifiedUtc}</td>
                    <td className="d-flex justify-content-end">
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
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {editing && (
        <SecretEditModal
          target={editing}
          provider={provider}
          providers={providers}
          existingKeys={secrets}
          isSaving={isSending}
          errorMessage={commandError}
          onSubmit={handleEditSubmit}
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
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setPendingDelete(null);
            setCommandError(null);
          }}
        />
      )}

      {showBulk && (
        <BulkApplyModal
          provider={provider}
          existing={secrets}
          onRun={handleBulkRun}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
};

export default Secrets;
