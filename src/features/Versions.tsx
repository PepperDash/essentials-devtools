import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';
import useAppParams from '../shared/hooks/useAppParams';
import { SortableTh } from '../shared/SortableTh';
import { SortAccessors, useSort } from '../shared/sorting';
import { Version, useGetVersionsQuery } from '../store/apiSlice';

type VersionColumn = 'name' | 'version';
const VERSION_SORT: SortAccessors<Version, VersionColumn> = {
  name: (v) => v.Name,
  version: (v) => v.Version,
};

const Versions = () => {
  const { appId } = useAppParams();
  const { data: versions } = useGetVersionsQuery(appId ? { appId } : skipToken);
  const sorter = useSort(VERSION_SORT);

  // The default order is by name
  const byName = useMemo(
    () => [...(versions ?? [])].sort((a, b) => a.Name.localeCompare(b.Name)),
    [versions]
  );
  const rows = useMemo(() => sorter.apply(byName), [sorter, byName]);

  if (!versions) {
    return <div>Loading...</div>;
  }

  return (
    <div className="d-flex flex-column h-100" style={{ minHeight: 0 }}>
      <h2 className="mb-2 flex-shrink-0">Loaded Assemblies and Versions</h2>
      <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <SortableTh sorter={sorter} column="name" label="Name" />
              <SortableTh sorter={sorter} column="version" label="Version" />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.Name}>
                <td>{i.Name}</td>
                <td>{i.Version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Versions;
