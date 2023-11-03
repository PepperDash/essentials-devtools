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
      <div className="d-flex flex-column">
        {sorted?.map((i) => (
          <div className="d-flex" key={i.Type}>
            {i.Type} : {i.Description} : {i.CType}
          </div>
        ))}
      </div>
    </>
  );
};


export default Types;