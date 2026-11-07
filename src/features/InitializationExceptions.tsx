import { skipToken } from '@reduxjs/toolkit/query';
import { Fragment, useMemo, useState } from 'react';
import EmptyState from '../shared/components/EmptyState';
import useAppParams from '../shared/hooks/useAppParams';
import { SortableTh } from '../shared/SortableTh';
import { SortAccessors, useSort } from '../shared/sorting';
import {
  EssentialsException,
  useGetInitializationExceptionsQuery,
} from '../store/apiSlice';

// Each exception keeps its original position: it's the number shown, and what an expanded row is
// remembered by, so both survive the table being sorted
interface NumberedException {
  number: number;
  exception: EssentialsException;
}

type ExceptionColumn = 'number' | 'message';
const EXCEPTION_SORT: SortAccessors<NumberedException, ExceptionColumn> = {
  number: (e) => e.number,
  message: (e) => e.exception.Message,
};

const InitializationExceptions = () => {
  const { appId } = useAppParams();
  const { data, isLoading, isError } = useGetInitializationExceptionsQuery(
    appId ? { appId } : skipToken
  );

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const sorter = useSort(EXCEPTION_SORT);
  const exceptions = data?.Exceptions;
  const rows = useMemo(
    () =>
      sorter.apply(
        (exceptions ?? []).map((exception, i) => ({
          number: i + 1,
          exception,
        }))
      ),
    [sorter, exceptions]
  );

  if (isLoading) return <div className="p-3">Loading…</div>;
  if (isError)
    return (
      <div className="p-3 text-danger">
        Failed to load initialization exceptions.
      </div>
    );

  if (!data || data.Exceptions.length === 0) {
    return (
      <EmptyState
        title="No initialization exceptions reported."
        description="Every device, room and plugin initialized without throwing."
      />
    );
  }

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className="mb-2">Initialization Exceptions</h2>
      <div className="overflow-auto flex-grow-1">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead>
            <tr>
              <SortableTh
                sorter={sorter}
                column="number"
                label="#"
                style={{ width: '2rem' }}
              />
              <SortableTh sorter={sorter} column="message" label="Message" />
              <th style={{ width: '8rem' }}>Stack trace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ number, exception: ex }) => {
              const idx = number - 1;
              const isExpanded = expandedIndex === idx;
              return (
                <Fragment key={`ex-${idx}`}>
                  <tr>
                    <td className="text-muted">{number}</td>
                    <td>
                      <span className="text-danger fw-semibold">
                        {ex.Message}
                      </span>
                    </td>
                    <td>
                      {ex.StackTrace && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            setExpandedIndex(isExpanded ? null : idx)
                          }
                        >
                          {isExpanded ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && ex.StackTrace && (
                    <tr>
                      <td colSpan={3} className="p-0">
                        <pre
                          className="m-0 p-3 bg-light text-muted"
                          style={{
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {ex.StackTrace}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InitializationExceptions;
