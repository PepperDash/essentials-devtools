import { Form } from "react-bootstrap";

import { BulkEntryResult, BulkSecretAction, BulkSummary } from "../../store/secretsContract";
import { SecretsFileIssue } from "./secretsFile";

export interface BulkPreviewTableProps {
  results: BulkEntryResult[];
  summary: BulkSummary;
  /** Client-side problems found while parsing the file, shown alongside the server's verdict. */
  warnings: SecretsFileIssue[];
  /** `${provider}\u0000${key}` for every existing record this tool does not manage. */
  unmanagedKeys: ReadonlySet<string>;
  overwrite: boolean;
  onOverwriteChange?: (next: boolean) => void;
  /** True while a dry run is in flight, so the table reads as provisional. */
  isRefreshing?: boolean;
  /** Hides the overwrite control and the caption once the batch has been applied. */
  readOnly?: boolean;
}

const ACTION_BADGE: Record<BulkSecretAction, string> = {
  create: "text-bg-success",
  overwrite: "text-bg-warning",
  skip: "text-bg-secondary",
  invalid: "text-bg-danger",
  failed: "text-bg-danger",
};

const ACTION_LABEL: Record<BulkSecretAction, string> = {
  create: "Create",
  overwrite: "Overwrite",
  skip: "Skip",
  invalid: "Invalid",
  failed: "Failed",
};

export function unmanagedId(provider: string, key: string): string {
  return `${provider}\u0000${key}`;
}

/**
 * Shows what a bulk apply will do, before it does it.
 *
 * Presentational only - no store, no mutations - which is what lets it be tested directly.
 */
const BulkPreviewTable = ({
  results,
  summary,
  warnings,
  unmanagedKeys,
  overwrite,
  onOverwriteChange,
  isRefreshing = false,
  readOnly = false,
}: BulkPreviewTableProps) => {
  const applicable = summary.create + summary.overwrite;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
        <div className="small">
          <span className="fw-semibold">{summary.total}</span> entr
          {summary.total === 1 ? "y" : "ies"}
          {summary.create > 0 && <> · {summary.create} new</>}
          {summary.overwrite > 0 && <> · {summary.overwrite} overwrite</>}
          {summary.skip > 0 && <> · {summary.skip} skipped</>}
          {summary.invalid > 0 && (
            <> · <span className="text-danger">{summary.invalid} invalid</span></>
          )}
          {summary.failed > 0 && (
            <> · <span className="text-danger">{summary.failed} failed</span></>
          )}
        </div>

        {!readOnly && onOverwriteChange && (
          <Form.Check
            type="switch"
            id="bulk-overwrite"
            className="small ms-auto"
            checked={overwrite}
            disabled={isRefreshing}
            onChange={(e) => onOverwriteChange(e.target.checked)}
            label="Replace secrets that already exist"
          />
        )}
      </div>

      {warnings.length > 0 && (
        <div className="alert alert-warning py-2 px-3 small" role="alert">
          <div className="fw-semibold mb-1">
            {warnings.length} problem{warnings.length === 1 ? "" : "s"} in the file:
          </div>
          <ul className="mb-0 ps-3">
            {warnings.map((issue, index) => (
              <li key={`${issue.code}-${issue.index ?? index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight: 320 }}>
        <table className="table table-sm table-striped table-bordered mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th>Key</th>
              <th>Provider</th>
              <th>Action</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const overwritesUnmanaged =
                result.action === "overwrite" &&
                unmanagedKeys.has(unmanagedId(result.provider, result.key));

              return (
                <tr key={`${result.provider}-${result.key}-${result.index}`}>
                  <td className="text-break">{result.key || <em className="text-muted">(blank)</em>}</td>
                  <td>{result.provider}</td>
                  <td>
                    <span className={`badge ${ACTION_BADGE[result.action]}`}>
                      {ACTION_LABEL[result.action]}
                    </span>
                    {result.applied && (
                      <span className="badge text-bg-light ms-1">applied</span>
                    )}
                    {overwritesUnmanaged && (
                      <span className="badge text-bg-danger ms-1">not managed here</span>
                    )}
                  </td>
                  <td className="small text-muted">{result.message}</td>
                </tr>
              );
            })}

            {results.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted small">
                  Nothing to apply.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="small text-muted mt-2">
          {applicable === 0
            ? "Nothing in this file would be written."
            : `${applicable} secret${applicable === 1 ? "" : "s"} will be written. Nothing has been changed yet.`}
        </div>
      )}
    </div>
  );
};

export default BulkPreviewTable;
