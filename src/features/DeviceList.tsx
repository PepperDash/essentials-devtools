import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
import { IKeyed, useGetDevicesQuery } from '../store/apiSlice';
import DeviceDetail from './DeviceDetail';

const DeviceList = () => {
  const [selectedDevice, setSelectedDevice] = useState<IKeyed>();
  const { appId } = useAppParams();
  const { data: devices } = useGetDevicesQuery(appId ? { appId } : skipToken);

  if (!devices) {
    return <div>Loading...</div>;
  }

  // Below md there's no room for both panes: show the list, or the selected device with a way back
  return (
    <div className="h-100 overflow-hidden d-flex gap-3">
      <div
        className={`h-100 overflow-hidden flex-column device-list-pane ${selectedDevice ? 'd-none d-md-flex' : 'd-flex'}`}
      >
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
                  className={`cursor-pointer${selectedDevice?.Key === i.Key ? ' table-active' : ''}`}
                  onClick={() => setSelectedDevice(i)}
                >
                  <td className="text-break">{i.Key}</td>
                  <td className="text-break">{i.Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div
        className={`h-100 overflow-hidden flex-fill flex-column ${selectedDevice ? 'd-flex' : 'd-none d-md-flex'}`}
      >
        {selectedDevice && (
          <>
            <Button
              variant="link"
              className="d-md-none align-self-start px-0 mb-1"
              onClick={() => setSelectedDevice(undefined)}
            >
              ‹ All devices
            </Button>
            <DeviceDetail item={selectedDevice} />
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
