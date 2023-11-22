
import { useMemo } from 'react';
import { FilterClearButton } from '../../shared/FilterClearButton';
import { FilterDropdownSearchParams } from '../../shared/FilterDropdownSearchParams';
import { IdLabel } from '../../shared/types/IdLabel';
import { useGetDevicesQuery } from '../../store/apiSlice';
import { debugConsts, debugSearchParams, logLevelOpts } from "./debugConsts";


export const DebugFilters = () => {
  const { data: devices } = useGetDevicesQuery();

  const items = useMemo(() => {
    if (!devices) return [{ id: debugConsts.GLOBAL, label: "Global"}];

    let fullList: IdLabel[] = [
      { id: debugConsts.GLOBAL, label: "Global"}
    ];

    devices.forEach((d) => {
      fullList.push({ id: d.Key, label: d.Name});
    });

    return fullList;
  }, [devices]);

 if (!devices) return null;

  return (
    <div className="row row-cols-sm-auto g-3 user-select-none">
      <div className="col-12 d-none d-lg-block">
            <FilterDropdownSearchParams
              paramName={debugConsts.DEVICE}
              buttonLabel="Devices"
              items={items}
            />
            <FilterDropdownSearchParams
              paramName={debugConsts.LOG_LEVEL}
              buttonLabel="Log Level"
              items={logLevelOpts}
              />
        <FilterClearButton allParams={Object.values(debugSearchParams)} />
      </div>
    </div>
  );
};
