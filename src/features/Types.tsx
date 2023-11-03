import { Type, useGetTypesQuery } from '../store/apiSlice';

const Types = () => {
  const { data: types } = useGetTypesQuery();

  if (!types) {
    return <div>Loading...</div>;
  }

  const unsorted: Type[] = [];
  Object.assign(unsorted, types)

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
    <>
    <h2>The type names supported by the currently loaded plugins</h2>
    <thead>
      <tr>
        <th>Type Name</th>
        <th>Class Type</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody >
        {sorted?.map((i) => (
          <tr key={i.Type}>
            <td>{i.Type}</td>
            <td>{i.CType}</td>
            <td>{i.Description}</td>
          </tr>
        ))}
    </tbody>
    </>
  );
};


export default Types;