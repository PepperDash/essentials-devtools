import { skipToken } from '@reduxjs/toolkit/query';
import useAppParams from '../shared/hooks/useAppParams';
import { Type, useGetTypesQuery } from "../store/apiSlice";

const Types = () => {
  const { appId } = useAppParams();
  const { data: types } = useGetTypesQuery(appId ? { appId } : skipToken);

  if (!types) {
    return <div>Loading...</div>;
  }

  const unsorted: Type[] = [];
  Object.assign(unsorted, types);

  const sorted = unsorted.sort((a, b) => {
    if (a.Type < b.Type) {
      return -1;
    }
    if (a.Type > b.Type) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="h-100 d-flex flex-column overflow-hidden">
      <h2 className="mb-2">
        The Type Names Supported by the Currently Loaded Plugins
      </h2>
      <div className='h-100 flex-grow-1 overflow-auto'>
        <table className="table table-striped table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th className="position-sticky top-0 bg-body">Type Name</th>
              <th className="position-sticky top-0 bg-body">Class Type</th>
              <th className="position-sticky top-0 bg-body">Description</th>
            </tr>
          </thead>
          <tbody>
            {sorted?.map((i) => (
              <tr key={i.Type}>
                <td>{i.Type}</td>
                <td>{i.CType}</td>
                <td>{i.Description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Types;
