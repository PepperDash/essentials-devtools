import { skipToken } from '@reduxjs/toolkit/query';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from 'react-bootstrap';
import EmptyState from '../shared/components/EmptyState';
import { FilterSearchText } from '../shared/FilterSearchText';
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

type PluginIssue = PluginLoadReport['Issues'][number];

// One table row per issue. A plugin that reports no issues still gets a row (issue is null) so a
// plugin that failed to load can't disappear from the list.
interface IssueRow {
  key: string;
  report: PluginLoadReport;
  issue: PluginIssue | null;
  builtAgainst: string;
  searchText: string;
}

type IssueColumn =
  | 'severity'
  | 'plugin'
  | 'version'
  | 'status'
  | 'category'
  | 'message'
  | 'triggeredBy'
  | 'builtAgainst';

const ISSUE_SORT: SortAccessors<IssueRow, IssueColumn> = {
  // Errors before warnings when ascending
  severity: ({ issue }) => (issue ? (issue.Severity === 'Error' ? 0 : 1) : 2),
  plugin: ({ report }) => report.FileName,
  version: ({ report }) => report.Version,
  status: ({ report }) => statusLabel(report.Status),
  category: ({ issue }) => (issue ? categoryLabel(issue.Category) : ''),
  message: ({ issue }) => issue?.Message,
  triggeredBy: ({ issue }) => issue?.TriggeredBy,
  builtAgainst: ({ builtAgainst }) => builtAgainst,
};

const builtAgainstText = (report: PluginLoadReport) =>
  Object.entries(report.BuiltAgainst ?? {})
    .map(([pkg, version]) => `${pkg} ${version}`)
    .join(', ');

// Lets a long file name wrap after a dot instead of in the middle of a word
const fileNameParts = (fileName: string) =>
  fileName.split('.').map((part, i, parts) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          .<wbr />
        </>
      )}
    </Fragment>
  ));

const toRows = (plugins: PluginLoadReport[]): IssueRow[] =>
  plugins.flatMap((report) => {
    const builtAgainst = builtAgainstText(report);
    const make = (issue: PluginIssue | null, index: number): IssueRow => ({
      key: `${report.FileName}-${index}`,
      report,
      issue,
      builtAgainst,
      searchText: [
        report.FileName,
        report.AssemblyName,
        report.Version,
        statusLabel(report.Status),
        builtAgainst,
        issue?.Severity,
        issue && categoryLabel(issue.Category),
        issue?.Message,
        issue?.Detail,
        issue?.TriggeredBy,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    });
    return report.Issues.length === 0
      ? [make(null, 0)]
      : report.Issues.map((issue, index) => make(issue, index));
  });

const PluginLoadIssues = () => {
  const { appId } = useAppParams();
  const { data, isLoading, isError } = useGetPluginLoadIssuesQuery(
    appId ? { appId } : skipToken,
    // The report is fixed for one program run, so it isn't polled. TopNav keeps the query
    // subscribed for its badge, though, so without this a visit after a program restart would
    // show the previous run's issues. Refetching on mount also refreshes that badge.
    { refetchOnMountOrArgChange: true }
  );

  const [search, setSearch] = useState('');
  const sorter = useSort(ISSUE_SORT);

  const allRows = useMemo(() => toRows(data?.Plugins ?? []), [data]);
  const visible = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return allRows;
    return allRows.filter((row) =>
      terms.every((term) => row.searchText.includes(term))
    );
  }, [allRows, search]);
  const rows = useMemo(() => sorter.apply(visible), [sorter, visible]);

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

  const showBuiltAgainst = allRows.some((row) => row.builtAgainst);
  const filtered = visible.length !== allRows.length;

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
      <div className="d-flex align-items-center gap-2 mb-2">
        <FilterSearchText
          value={search}
          onChangeValue={setSearch}
          debounceMs={150}
          placeholder="Search plugin, category, message, status…"
        />
        {filtered && (
          <span className="console-count">
            Showing {visible.length} of {allRows.length}
          </span>
        )}
      </div>
      <div className="overflow-auto flex-grow-1 pane-scroll-sm">
        {visible.length === 0 ? (
          <EmptyState
            tone="neutral"
            title="No issues match your search."
            description="Try part of a plugin name, category, status or message."
          />
        ) : (
          <table className="table table-hover align-top mb-0 plugin-issues-table">
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
                  column="plugin"
                  label="Plugin"
                  style={{ width: '22rem' }}
                />
                <SortableTh
                  sorter={sorter}
                  column="version"
                  label="Version"
                  style={{ width: '7rem' }}
                />
                <SortableTh
                  sorter={sorter}
                  column="status"
                  label="Status"
                  style={{ width: '8rem' }}
                />
                <SortableTh
                  sorter={sorter}
                  column="category"
                  label="Category"
                  style={{ width: '12rem' }}
                />
                <SortableTh sorter={sorter} column="message" label="Message" />
                <SortableTh
                  sorter={sorter}
                  column="triggeredBy"
                  label="Triggered by"
                  style={{ width: '9rem' }}
                />
                {showBuiltAgainst && (
                  <SortableTh
                    sorter={sorter}
                    column="builtAgainst"
                    label="Built against"
                    style={{ width: '14rem' }}
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, report, issue, builtAgainst }) => (
                <tr key={key}>
                  <td>
                    {issue && (
                      <Badge
                        bg={severityVariant(issue.Severity)}
                        text={badgeText(severityVariant(issue.Severity))}
                      >
                        {issue.Severity}
                      </Badge>
                    )}
                  </td>
                  <td className="fw-semibold plugin-file-name">
                    {fileNameParts(report.FileName)}
                  </td>
                  <td className="text-nowrap">{report.Version}</td>
                  <td>
                    <Badge
                      bg={statusVariant(report.Status)}
                      text={badgeText(statusVariant(report.Status))}
                    >
                      {statusLabel(report.Status)}
                    </Badge>
                  </td>
                  <td>{issue && categoryLabel(issue.Category)}</td>
                  <td className="text-break">
                    {issue ? (
                      <>
                        {issue.Message}
                        {issue.Detail && (
                          <div className="text-muted small mt-1">
                            {issue.Detail}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">No issues reported</span>
                    )}
                  </td>
                  <td className="text-break">
                    {issue &&
                      (issue.TriggeredBy === 'Direct load' ? (
                        <span className="text-muted">Direct load</span>
                      ) : (
                        issue.TriggeredBy
                      ))}
                  </td>
                  {showBuiltAgainst && (
                    <td className="text-break small">{builtAgainst}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PluginLoadIssues;
