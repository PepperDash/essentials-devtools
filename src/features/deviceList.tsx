import { useGetDevicesQuery } from "../store/apiSlice";

const DeviceList = () => {
  const { data: devices } = useGetDevicesQuery();

  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {devices &&
        devices?.map(({ Name, Key }) => (
          <div className="d-flex" key={Key}>
            <h2>{Name}</h2>
            <p>{Key}</p>
          </div>
        ))}
    </>
  );
};

export default DeviceList;
