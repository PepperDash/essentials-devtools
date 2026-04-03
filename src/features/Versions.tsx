import { skipToken } from '@reduxjs/toolkit/query';
import useAppParams from '../shared/hooks/useAppParams';
import { Version, useGetVersionsQuery } from "../store/apiSlice";

const Versions = () => {
  const { appId } = useAppParams();
  const { data: versions } = useGetVersionsQuery(appId ? { appId } : skipToken);

  if (!versions) {
    return <div>Loading...</div>;
  }

  const unsorted: Version[] = [];
  Object.assign(unsorted, versions)

  const sorted = unsorted.sort((a, b) => {
    if (a.Name < b.Name) {
      return -1;
    }
    if (a.Name > b.Name) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className='mb-2'>Loaded Assemblies and Versions</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          {sorted?.map((i) => (
            <tr key={i.Name}>
              <td>{i.Name}</td>
              <td>{i.Version}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Versions;
