import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState } from 'react';
import EmptyState from '../shared/components/EmptyState';
import { FilterSearchText } from '../shared/FilterSearchText';
import useAppParams from '../shared/hooks/useAppParams';
import { useGetTypesQuery } from '../store/apiSlice';

const Types = () => {
  const { appId } = useAppParams();
  const { data: types } = useGetTypesQuery(appId ? { appId } : skipToken);
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () =>
      [...(types ?? [])].sort((a, b) => {
        if (a.Type < b.Type) {
          return -1;
        }
        if (a.Type > b.Type) {
          return 1;
        }
        return 0;
      }),
    [types]
  );

  // Every whitespace-separated term must appear (case-insensitive) in the type name, class or
  // description
  const visible = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return sorted;
    return sorted.filter((t) => {
      const haystack = `${t.Type} ${t.CType} ${t.Description}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [sorted, search]);

  if (!types) {
    return <div>Loading...</div>;
  }

  const filtered = visible.length !== sorted.length;

  return (
    <div className="h-100 d-flex flex-column overflow-hidden">
      <div className="d-flex align-items-baseline gap-2 mb-2">
        <h2 className="mb-0">
          The Type Names Supported by the Currently Loaded Plugins
        </h2>
        <span className="console-count">
          {filtered
            ? `Showing ${visible.length} of ${sorted.length}`
            : `${sorted.length} types`}
        </span>
      </div>
      <div className="mb-2">
        <FilterSearchText
          value={search}
          onChangeValue={setSearch}
          debounceMs={150}
          placeholder="Search type name, class or description"
        />
      </div>
      <div className="h-100 flex-grow-1 overflow-auto">
        {visible.length === 0 ? (
          <EmptyState
            tone="neutral"
            title="No types match your search."
            description="Try part of a type name, class or description."
          />
        ) : (
          <table className="table table-striped table-bordered mb-0">
            <thead>
              <tr>
                <th>Type Name</th>
                <th>Class Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.Type}>
                  <td>{i.Type}</td>
                  <td>{i.CType}</td>
                  <td>{i.Description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Types;
