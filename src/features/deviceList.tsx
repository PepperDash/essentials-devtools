import { useGetDevicesQuery } from "../store/apiSlice";

const DeviceList = () => {
  const { data: devices } = useGetDevicesQuery();

  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {devices &&
        devices?.map(({ name, key }) => (
          <div className="d-flex">
            <h2>{name}</h2>
            <p>{key}</p>
          </div>
        ))}
      ;
    </>
  );
};

export default DeviceList;
