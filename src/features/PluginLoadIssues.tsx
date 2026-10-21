import { skipToken } from '@reduxjs/toolkit/query';
import { Fragment, useState } from 'react';
import { Badge } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
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

  if (isLoading) return <div className="p-3">Loading…</div>;
  if (isError)
    return (
      <div className="p-3 text-danger">Failed to load plugin load issues.</div>
    );

  if (!data || data.Plugins.length === 0) {
    return (
      <div className="p-3">
        <div className="text-success">No plugin load issues reported.</div>
        {data && (
          <div className="text-muted small mt-1">
            Running Essentials {data.EssentialsVersion}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
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
      <div className="overflow-auto flex-grow-1">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: '6rem' }}>Severity</th>
              <th style={{ width: '14rem' }}>Category</th>
              <th>Message</th>
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
                  {report.Issues.map((issue, idx) => {
                    const key = `${report.FileName}-${idx}`;
                    const isExpanded = expandedKey === key;
                    return (
                      <Fragment key={key}>
                        <tr>
                          <td>
                            <Badge
                              bg={severityVariant(issue.Severity)}
                              text={badgeText(severityVariant(issue.Severity))}
                            >
                              {issue.Severity}
                            </Badge>
                          </td>
                          <td>{categoryLabel(issue.Category)}</td>
                          <td>
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
