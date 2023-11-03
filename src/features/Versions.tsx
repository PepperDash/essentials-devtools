import { Version, useGetVersionsQuery } from "../store/apiSlice";

const Versions = () => {
  const { data: versions } = useGetVersionsQuery();

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
    <>
    <h2>Loaded Assemblies and Versions</h2>
      <thead>
        <tr>
          <th>Name</th>
          <th>Version</th>
        </tr>
      </thead>
      <tbody >
        {sorted?.map((i) => (
          <tr key={i.Name}>
            <td>{i.Name}</td>
            <td>{i.Version}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
};

export default Versions;
