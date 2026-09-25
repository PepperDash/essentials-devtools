import { useEffect, useRef, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';

import {
  BulkSecretEntry,
  BulkSecretsResponse,
} from '../../store/secretsContract';
import BulkPreviewTable from './BulkPreviewTable';
import {
  MAX_FILE_BYTES,
  parseSecretsFile,
  SecretsFileIssue,
} from './secretsFile';
import styles from './BulkApplyModal.module.scss';

export interface BulkApplyModalProps {
  provider: string;
  /** Runs a preview or a commit and resolves with the processor's verdict. */
  onRun: (
    entries: BulkSecretEntry[],
    options: {
      mode: 'preview' | 'commit';
      overwrite: boolean;
      allowUnmanagedOverwrite: boolean;
    }
  ) => Promise<BulkSecretsResponse>;
  onClose: () => void;
}

type Stage = 'choose' | 'review' | 'done';

/**
 * Applies a file of secrets, with a mandatory preview.
 *
 * Three things here are load-bearing for safety rather than for looks:
 *
 *   1. The parsed entries live in local state and never enter Redux, so plaintext values stay out
 *      of the store and out of Redux DevTools.
 *   2. Window-level drag handlers are installed while the modal is open. Without them, a drop that
 *      misses the drop zone makes the browser navigate to the file - destroying the page and
 *      putting a credential file in the address bar and history.
 *   3. Nothing is written until the user presses Apply. The only request before that is a preview,
 *      which the processor answers without touching the store.
 */
const BulkApplyModal = ({ provider, onRun, onClose }: BulkApplyModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('choose');
  const [fileName, setFileName] = useState<string | null>(null);
  const [entries, setEntries] = useState<BulkSecretEntry[]>([]);
  const [warnings, setWarnings] = useState<SecretsFileIssue[]>([]);
  const [issues, setIssues] = useState<SecretsFileIssue[]>([]);
  const [response, setResponse] = useState<BulkSecretsResponse | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [acknowledgeUnmanaged, setAcknowledgeUnmanaged] = useState(false);
  // Entries the processor held back because they would overwrite a record this tool does not
  // manage. Taken from the processor's own verdict, which is authoritative for every provider.
  const [unmanagedIndices, setUnmanagedIndices] = useState<ReadonlySet<number>>(
    new Set()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // A drop landing anywhere but the zone would otherwise navigate away from the app, taking the
  // unsaved state with it and exposing the file path.
  useEffect(() => {
    const swallow = (event: DragEvent) => event.preventDefault();
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  const resetFile = () => {
    setEntries([]);
    setWarnings([]);
    setIssues([]);
    setResponse(null);
    setFileName(null);
    setAcknowledgeUnmanaged(false);
    setUnmanagedIndices(new Set());
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setError(null);
    setIssues([]);

    // Checked before reading so a large file is never pulled into memory.
    if (file.size > MAX_FILE_BYTES) {
      setIssues([
        {
          code: 'tooLarge',
          message: `"${file.name}" is too large. The limit is ${Math.round(MAX_FILE_BYTES / 1024)} KB.`,
        },
      ]);
      return;
    }

    const text = await file.text();
    const parsed = parseSecretsFile({
      text,
      fileName: file.name,
      fileSize: file.size,
    });

    if (!parsed.ok) {
      setIssues(parsed.issues);
      setFileName(file.name);
      return;
    }

    // The processor writes every entry to the request's provider and only echoes a per-entry one
    // back, so a file aimed at another provider would land somewhere other than the preview says.
    const otherProviders = [
      ...new Set(
        parsed.entries
          .map((entry) => entry.provider)
          .filter(
            (p): p is string =>
              !!p && p.toLowerCase() !== provider.toLowerCase()
          )
      ),
    ];
    if (otherProviders.length > 0) {
      setIssues([
        {
          code: 'providerMismatch',
          message: `This file is for ${otherProviders
            .map((p) => `"${p}"`)
            .join(
              ', '
            )}, not "${provider}". Switch to that provider to apply it, or remove the provider from the file.`,
        },
      ]);
      setFileName(file.name);
      return;
    }

    setFileName(file.name);
    setEntries(parsed.entries);
    setWarnings(parsed.warnings);
    await run(parsed.entries, 'preview', overwrite, false);
  };

  const run = async (
    toRun: BulkSecretEntry[],
    mode: 'preview' | 'commit',
    overwriteFlag: boolean,
    allowUnmanaged: boolean
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await onRun(toRun, {
        mode,
        overwrite: overwriteFlag,
        allowUnmanagedOverwrite: allowUnmanaged,
      });
      setResponse(result);
      setStage(mode === 'commit' ? 'done' : 'review');

      // Only a run that did NOT allow unmanaged overwrites reports them, as skips; once allowed
      // they come back as ordinary overwrites, so keep the set from the last run that could see it.
      if (!allowUnmanaged) {
        setUnmanagedIndices(
          new Set(
            (result.entries ?? [])
              .filter(
                (entry) =>
                  entry.action === 'skip' && entry.reason === 'unmanagedTarget'
              )
              .map((entry) => entry.index)
          )
        );
      }

      if (mode === 'commit') {
        // The values have served their purpose; drop them as soon as the write lands. The results
        // kept for display carry only keys and outcomes.
        setEntries([]);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleOverwriteChange = (next: boolean) => {
    setOverwrite(next);
    setAcknowledgeUnmanaged(false);
    // Re-preview so what is shown always matches the flag that would actually be sent.
    void run(entries, 'preview', next, false);
  };

  const handleAcknowledgeChange = (next: boolean) => {
    setAcknowledgeUnmanaged(next);
    // Re-preview so the unmanaged rows show as the overwrites Apply would now perform.
    void run(entries, 'preview', overwrite, next);
  };

  const unmanagedCount = unmanagedIndices.size;

  const applicable =
    (response?.summary.create ?? 0) + (response?.summary.overwrite ?? 0);
  const blocked =
    busy || applicable === 0 || (response?.summary.invalid ?? 0) > 0;

  return (
    <Modal
      show
      onHide={onClose}
      centered
      size="lg"
      // Static once a file is loaded, so a stray backdrop click cannot discard a reviewed batch.
      backdrop={stage === 'choose' ? true : 'static'}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {stage === 'done'
            ? 'Secrets applied'
            : `Apply a secrets file to ${provider}`}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {stage === 'choose' && (
          <>
            <div className="alert alert-warning py-2 px-3 small" role="alert">
              This file contains credentials in plain text. Delete it when you
              are finished, and do not commit it to source control.
            </div>

            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length > 1) {
                  setIssues([
                    { code: 'notJson', message: 'Drop one file at a time.' },
                  ]);
                  return;
                }
                void handleFile(e.dataTransfer.files[0]);
              }}
            >
              <p className="mb-2 text-muted">
                Drop a .json file here, or choose one:
              </p>
              <Form.Control
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                disabled={busy}
                // Cleared after each pick so choosing the same file again still fires a change.
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  void handleFile(input.files?.[0]);
                }}
              />
            </div>

            {busy && (
              <div className="d-flex align-items-center gap-2 mt-3 small">
                <Spinner as="span" size="sm" />
                <span>Checking the file…</span>
              </div>
            )}

            {issues.length > 0 && (
              <div
                className="alert alert-danger py-2 px-3 small mt-3 mb-0"
                role="alert"
              >
                <div className="fw-semibold mb-1">
                  {fileName
                    ? `"${fileName}" could not be read:`
                    : 'The file could not be read:'}
                </div>
                <ul className="mb-0 ps-3">
                  {issues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-3 small">
              <summary className="text-muted">Expected file format</summary>
              <pre className="bg-body-secondary p-2 rounded mt-2 mb-0">
                {`{
  "provider": "${provider}",
  "secrets": {
    "displayPassword": "…",
    "codecPassword": "…"
  }
}`}
              </pre>
              <p className="text-muted mt-2 mb-0">
                Download a template to get this file pre-filled with the keys
                already stored here.
              </p>
            </details>
          </>
        )}

        {stage !== 'choose' && response && (
          <>
            {fileName && (
              <div className="small text-muted mb-2">
                From <strong>{fileName}</strong>
              </div>
            )}

            <BulkPreviewTable
              results={response.entries ?? []}
              summary={response.summary}
              warnings={warnings}
              unmanagedIndices={unmanagedIndices}
              overwrite={overwrite}
              onOverwriteChange={handleOverwriteChange}
              isRefreshing={busy}
              readOnly={stage === 'done'}
            />

            {stage === 'review' && (response.summary.invalid ?? 0) > 0 && (
              <div
                className="alert alert-danger py-2 px-3 small mt-3 mb-0"
                role="alert"
              >
                Fix the invalid entries before applying. Nothing will be written
                while any entry is invalid.
              </div>
            )}

            {stage === 'review' && unmanagedCount > 0 && (
              <div
                className="alert alert-danger py-2 px-3 mt-3 mb-0"
                role="alert"
              >
                <Form.Check
                  type="checkbox"
                  id="bulk-ack-unmanaged"
                  checked={acknowledgeUnmanaged}
                  disabled={busy}
                  onChange={(e) => handleAcknowledgeChange(e.target.checked)}
                  label={`Also overwrite ${unmanagedCount} record${
                    unmanagedCount === 1 ? '' : 's'
                  } this tool does not manage. They may belong to another part of the system.`}
                />
              </div>
            )}

            {stage === 'done' && (
              <div
                className="alert alert-success py-2 px-3 small mt-3 mb-0"
                role="alert"
              >
                {response.summary.create + response.summary.overwrite} secret
                {response.summary.create + response.summary.overwrite === 1
                  ? ''
                  : 's'}{' '}
                written.
                {response.indexUpdated === false &&
                  ' Their details could not be recorded.'}
              </div>
            )}
          </>
        )}

        {error && (
          <div
            className="alert alert-danger py-2 px-3 small mt-3 mb-0"
            role="alert"
          >
            {error}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {stage === 'review' && (
          <Button
            variant="link"
            onClick={resetFile}
            disabled={busy}
            className="me-auto"
          >
            Choose a different file
          </Button>
        )}

        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {stage === 'done' ? 'Close' : 'Cancel'}
        </Button>

        {stage === 'review' && (
          <Button
            variant="danger"
            disabled={blocked}
            onClick={() =>
              void run(entries, 'commit', overwrite, acknowledgeUnmanaged)
            }
          >
            {busy
              ? 'Applying…'
              : `Apply ${applicable} secret${applicable === 1 ? '' : 's'}`}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default BulkApplyModal;
