
import { useMemo } from 'react';
import { FilterClearButton } from '../../shared/FilterClearButton';
import { FilterDropdownSearchParams } from '../../shared/FilterDropdownSearchParams';
import { IKeyed, useGetDevicesQuery } from '../../store/apiSlice';
import { debugConsts, debugSearchParams } from "./debugConsts";


export const DebugFilters = () => {
  const { data: devices } = useGetDevicesQuery();

  const items = useMemo(() => {
    if (!devices) return [{ Key: "", Name: "Global"}];

    let fullList: IKeyed[] = [
      { Key: debugConsts.GLOBAL, Name: "Global"}
    ];

    devices.forEach((d) => {
      fullList.push({ Key: d.Key, Name: d.Name});
    });

    return fullList;
  }, [devices]);

  console.log(items);

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
              paramName={debugConsts.AFTER}
              buttonLabel="After"
              items={items}
            />
            <FilterDropdownSearchParams
              paramName={debugConsts.DEVICE}
              buttonLabel="Before"
              items={items}
            />
        <FilterClearButton allParams={Object.values(debugSearchParams)} />
      </div>
    </div>
  );
};
