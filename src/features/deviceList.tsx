import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from "react";
import useAppParams from '../shared/hooks/useAppParams';
import { IKeyed, useGetDevicesQuery } from "../store/apiSlice";
import DeviceDetail from "./DeviceDetail";

const DeviceList = () => {
  const [selectedDevice, setSelectedDevice] = useState<IKeyed>();
  const { appId } = useAppParams();
  const { data: devices } = useGetDevicesQuery(appId ? { appId } : skipToken);

  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-100 overflow-hidden d-flex gap-3">
      <div className="h-100 overflow-hidden d-flex flex-column" style={{ minWidth: 0, flex: "0 0 33%" }}>
        <div className="h-100 overflow-auto">
          <h2>Devices</h2>
          <table className="table table-sm table-striped table-hover">
            <thead>
              <tr>
                <th>Key</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((i) => (
                <tr
                  key={i.Key}
                  className={`cursor-pointer${selectedDevice?.Key === i.Key ? " table-active" : ""}`}
                  onClick={() => setSelectedDevice(i)}
                >
                  <td>{i.Key}</td>
                  <td>{i.Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="h-100 overflow-hidden flex-fill">
        {selectedDevice && <DeviceDetail item={selectedDevice} />}
      </div>
    </div>
  );
};

export default DeviceList;
