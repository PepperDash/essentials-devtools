
import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';
import { Button } from 'react-bootstrap';
import useAppParams from '../../shared/hooks/useAppParams';
import { IdLabel } from '../../shared/types/IdLabel';
import { useGetDevicesQuery } from '../../store/apiSlice';
import { debugConsoleActions } from '../../store/debugConsole/debugConsoleSlice';
import { useAppDispatch } from '../../store/hooks';
import { debugConsts } from './debugConsts';
import { DeviceFilterDropdown } from './DeviceFilterDropdown';


export const DebugFilters = () => {
  const { appId } = useAppParams();
  const { data: devices } = useGetDevicesQuery(appId ? { appId } : skipToken);
  const dispatch = useAppDispatch();

  const items = useMemo(() => {
    if (!devices) return [{ id: debugConsts.GLOBAL, label: 'Global' }];

    const deviceItems: IdLabel[] = devices
      .map((d) => ({ id: d.Key, label: d.Name || d.Key }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return [{ id: debugConsts.GLOBAL, label: 'Global' }, ...deviceItems];
  }, [devices]);

  if (!devices) return null;

  return (
    <div className="row row-cols-sm-auto g-3 user-select-none">
      <div className="col-12 d-none d-lg-block">
        <DeviceFilterDropdown items={items} />
        <Button
          variant="outline-secondary"
          className="py-1 ms-1"
          onClick={() => dispatch(debugConsoleActions.clearAllFilters())}
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
};
