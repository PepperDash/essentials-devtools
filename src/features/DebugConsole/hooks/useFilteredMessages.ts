import filter from 'lodash/filter';
import { useMemo } from 'react';
import { LogMessage } from '../../../shared/types/LogMessage';
import {
  selectCheckedDevices,
  selectDeviceLevels,
  selectSearchText,
} from '../../../store/debugConsole/debugConsoleSelectors';
import { useAppSelector } from '../../../store/hooks';
import { debugConsts, LOG_LEVEL_ORDER } from '../debugConsts';

export function useFilteredMessages(listItems: LogMessage[]) {
  const checkedDevices = useAppSelector(selectCheckedDevices);
  const deviceLevels = useAppSelector(selectDeviceLevels);
  const searchText = useAppSelector(selectSearchText);

  return useMemo(() => {
    if (!listItems?.length) return [];

    const filtered = filter(listItems, (item) => {
      // Device filter
      let deviceMatch = true;
      if (checkedDevices.length) {
        deviceMatch = checkedDevices.some((val: string) => {
          if (!item.Properties?.Key) return val === debugConsts.GLOBAL;
          return item.Properties?.Key === val;
        });
      }

      // Per-device minimum log level filter
      let deviceLevelMatch = true;
      const messageKey = item.Properties?.Key ?? debugConsts.GLOBAL;
      const minLevel = deviceLevels[messageKey];
      if (minLevel !== undefined) {
        const msgOrder = LOG_LEVEL_ORDER[item.Level] ?? -1;
        const minOrder = LOG_LEVEL_ORDER[minLevel] ?? 0;
        deviceLevelMatch = msgOrder >= minOrder;
      }

      // Text search filter
      let textMatch = true;
      if (searchText.length) {
        const textMatchFields = [
          item.RenderedMessage,
          item.Timestamp,
          item.Properties?.Key,
        ];
        textMatch = searchText
          .split(' ')
          .filter(Boolean)
          .every((st: string) =>
            textMatchFields.some((f) =>
              f?.toLowerCase().includes(st.toLowerCase())
            )
          );
      }

      return deviceMatch && deviceLevelMatch && textMatch;
    });

    return filtered;
  }, [listItems, checkedDevices, deviceLevels, searchText]);
}
