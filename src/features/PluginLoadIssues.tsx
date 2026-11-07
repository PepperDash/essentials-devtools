import { skipToken } from '@reduxjs/toolkit/query';
import { Fragment, useState } from 'react';
import { Badge } from 'react-bootstrap';
import EmptyState from '../shared/components/EmptyState';
import useAppParams from '../shared/hooks/useAppParams';
import { SortableTh } from '../shared/SortableTh';
import { SortAccessors, useSort } from '../shared/sorting';
import {
  PluginLoadReport,
  useGetPluginLoadIssuesQuery,
} from '../store/apiSlice';
import {
  badgeText,
  categoryLabel,
  severityVariant,
  statusLabel,
  statusVariant,
} from '../store/pluginLoadIssuesContract';

const COLUMNS = 4;

// An issue keeps its original position in its plugin's list: an expanded row is remembered by it,
// so that survives the issues being sorted
type PluginIssue = PluginLoadReport['Issues'][number];
interface IndexedIssue {
  index: number;
  issue: PluginIssue;
}

type IssueColumn = 'severity' | 'category' | 'message';
const ISSUE_SORT: SortAccessors<IndexedIssue, IssueColumn> = {
  // Errors before warnings when ascending
  severity: ({ issue }) => (issue.Severity === 'Error' ? 0 : 1),
  category: ({ issue }) => categoryLabel(issue.Category),
  message: ({ issue }) => issue.Message,
};

const builtAgainstText = (report: PluginLoadReport) => {
  const entries = Object.entries(report.BuiltAgainst ?? {});
  if (entries.length === 0) return null;
  return entries.map(([pkg, version]) => `${pkg} ${version}`).join(', ');
};

const PluginLoadIssues = () => {
  const { appId } = useAppParams();
  const { data, isLoading, isError } = useGetPluginLoadIssuesQuery(
    appId ? { appId } : skipToken,
    // The report is fixed for one program run, so it isn't polled. TopNav keeps the query
    // subscribed for its badge, though, so without this a visit after a program restart would
    // show the previous run's issues. Refetching on mount also refreshes that badge.
    { refetchOnMountOrArgChange: true }
  );

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const sorter = useSort(ISSUE_SORT);

  if (isLoading) return <div className="p-3">Loading…</div>;
  if (isError)
    return (
      <div className="p-3 text-danger">Failed to load plugin load issues.</div>
    );

  if (!data || data.Plugins.length === 0) {
    return (
      <EmptyState
        title="No plugin load issues reported."
        description="Every plugin loaded and is compatible with this version of Essentials."
        meta={data ? `Running Essentials ${data.EssentialsVersion}` : undefined}
      />
    );
  }

  return (
    <div className="d-flex flex-column overflow-hidden h-100 page-scroll-sm">
      <h2 className="mb-1">Plugin Load Issues</h2>
      <div className="text-muted mb-2">
        Running Essentials {data.EssentialsVersion}. {data.IssueCount}{' '}
        {data.IssueCount === 1 ? 'issue' : 'issues'}
        {data.ErrorCount > 0 && (
          <>
            ,{' '}
            <span className="text-danger">
              {data.ErrorCount} {data.ErrorCount === 1 ? 'error' : 'errors'}
            </span>
          </>
        )}{' '}
        across {data.Plugins.length} plugin{' '}
        {data.Plugins.length === 1 ? 'file' : 'files'}. Warnings do not stop a
        plugin loading.
      </div>
      <div className="overflow-auto flex-grow-1 pane-scroll-sm">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <SortableTh
                sorter={sorter}
                column="severity"
                label="Severity"
                style={{ width: '6rem' }}
              />
              <SortableTh
                sorter={sorter}
                column="category"
                label="Category"
                className="d-none d-md-table-cell"
                style={{ width: '14rem' }}
              />
              <SortableTh sorter={sorter} column="message" label="Message" />
              <th style={{ width: '7rem' }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {data.Plugins.map((report) => {
              const builtAgainst = builtAgainstText(report);
              return (
                <Fragment key={report.FileName}>
                  <tr className="table-secondary">
                    <td colSpan={COLUMNS}>
                      <span className="fw-semibold me-2">
                        {report.FileName}
                      </span>
                      {report.Version && (
                        <span className="text-muted me-2">
                          v{report.Version}
                        </span>
                      )}
                      <Badge
                        bg={statusVariant(report.Status)}
                        text={badgeText(statusVariant(report.Status))}
                        className="me-2"
                      >
                        {statusLabel(report.Status)}
                      </Badge>
                      {builtAgainst && (
                        <span className="text-muted small">
                          Built against {builtAgainst}
                        </span>
                      )}
                    </td>
                  </tr>
                  {sorter
                    .apply(
                      report.Issues.map((issue, index) => ({ issue, index }))
                    )
                    .map(({ issue, index: idx }) => {
                      const key = `${report.FileName}-${idx}`;
                      const isExpanded = expandedKey === key;
                      return (
                        <Fragment key={key}>
                          <tr>
                            <td>
                              <Badge
                                bg={severityVariant(issue.Severity)}
                                text={badgeText(
                                  severityVariant(issue.Severity)
                                )}
                              >
                                {issue.Severity}
                              </Badge>
                            </td>
                            <td className="d-none d-md-table-cell">
                              {categoryLabel(issue.Category)}
                            </td>
                            <td className="text-break">
                              <div className="d-md-none small fw-semibold">
                                {categoryLabel(issue.Category)}
                              </div>
                              {issue.Message}
                              {issue.TriggeredBy !== 'Direct load' && (
                                <span className="text-muted small ms-1">
                                  (required by {issue.TriggeredBy})
                                </span>
                              )}
                            </td>
                            <td>
                              {issue.Detail && (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() =>
                                    setExpandedKey(isExpanded ? null : key)
                                  }
                                >
                                  {isExpanded ? 'Hide' : 'Show'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && issue.Detail && (
                            <tr>
                              <td colSpan={COLUMNS} className="p-0">
                                <pre
                                  className="m-0 p-3 bg-light text-muted"
                                  style={{
                                    fontSize: '0.75rem',
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  {issue.Detail}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PluginLoadIssues;
