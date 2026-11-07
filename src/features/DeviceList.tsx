import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../shared/components/EmptyState';
import { FilterSearchText } from '../shared/FilterSearchText';
import useAppParams from '../shared/hooks/useAppParams';
import { IKeyed, useGetDevicesQuery } from '../store/apiSlice';
import DeviceDetail from './DeviceDetail';

// The selected device lives in the URL, so a refresh or a shared link keeps it
const DEVICE_PARAM = 'device';

const DeviceList = () => {
  const { appId } = useAppParams();
  const { data: devices } = useGetDevicesQuery(appId ? { appId } : skipToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  const selectedKey = searchParams.get(DEVICE_PARAM);
  const selectedDevice = useMemo(
    () => devices?.find((d) => d.Key === selectedKey),
    [devices, selectedKey]
  );

  // Every whitespace-separated term must appear (case-insensitive) in the key or name
  const visible = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    const all = devices ?? [];
    if (terms.length === 0) return all;
    return all.filter((d) => {
      const haystack = `${d.Key} ${d.Name ?? ''}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [devices, search]);

  if (!devices) {
    return <div>Loading...</div>;
  }

  const select = (device: IKeyed | undefined) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (device) next.set(DEVICE_PARAM, device.Key);
        else next.delete(DEVICE_PARAM);
        return next;
      },
      { replace: true }
    );

  const filtered = visible.length !== devices.length;

  // Below md there's no room for both panes: show the list, or the selected device with a way back
  return (
    <div className="master-detail h-100">
      <div
        className={`master-pane flex-column ${selectedDevice ? 'd-none d-md-flex' : 'd-flex'}`}
      >
        <div className="master-pane-header">
          <div className="d-flex align-items-baseline gap-2 mb-2">
            <h2 className="master-pane-title">Devices</h2>
            <span className="console-count">
              {filtered
                ? `${visible.length} of ${devices.length}`
                : devices.length}
            </span>
          </div>
          <FilterSearchText
            value={search}
            onChangeValue={setSearch}
            debounceMs={150}
            placeholder="Filter devices"
          />
        </div>
        <div className="master-pane-scroll">
          {visible.length === 0 ? (
            <div className="p-3 small text-body-secondary">
              No devices match your filter.
            </div>
          ) : (
            <ul className="device-items" aria-label="Devices">
              {visible.map((d) => {
                const selected = d.Key === selectedDevice?.Key;
                return (
                  <li key={d.Key}>
                    <button
                      type="button"
                      className={`device-item${selected ? ' selected' : ''}`}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => select(d)}
                    >
                      <span className="device-item-name">
                        {d.Name || d.Key}
                      </span>
                      {d.Name && (
                        <span className="device-item-key">{d.Key}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div
        className={`detail-pane flex-column ${selectedDevice ? 'd-flex' : 'd-none d-md-flex'}`}
      >
        {selectedDevice ? (
          <>
            <Button
              variant="link"
              className="d-md-none align-self-start px-0 mb-1"
              onClick={() => select(undefined)}
            >
              ‹ All devices
            </Button>
            <DeviceDetail item={selectedDevice} />
          </>
        ) : (
          <EmptyState
            tone="neutral"
            title="Select a device"
            description="Choose a device from the list to see its properties, methods and feedbacks."
          />
        )}
      </div>
    </div>
  );
};

export default DeviceList;
