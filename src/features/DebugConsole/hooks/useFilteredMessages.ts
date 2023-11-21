import filter from 'lodash/filter';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Message } from '../DebugConsole';
import { debugConsts } from '../debugConsts';

export function useFilteredMessages(listItems: Message[]) {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    if (!listItems?.length) return [];


    const deviceValues = searchParams.getAll(
      debugConsts.DEVICE
    );
    const searchText = searchParams.getAll(debugConsts.SEARCH_TEXT);

    // filter for other criteria
    const filtered = filter(listItems, (item) => {


      let deviceMatch = true;
      if (deviceValues.length) {
        deviceValues.forEach((dev) => {
          // TODO: handle global
          // set deviceMatch to false if global and no key
          if(dev === debugConsts.GLOBAL && item.Properties?.Key) 
            deviceMatch = false;
          else if (item.Properties?.Key !== dev) {
            deviceMatch = false;
          }
        });
      }

      // Match search string on visible things
      let textMatch = true;
      if (searchText.length) {
        const textMatchFields = [
          item.MessageTemplate,
        ];
        // true if for every search text word, some field contains it
        textMatch = searchText.every((st) =>
          textMatchFields.some((f) => f?.toLowerCase().includes(st))
        );
      }
      return (
        deviceMatch &&
        textMatch
      ); // && otherMatches
    });

    // DONE
    return filtered;
  }, [searchParams, listItems]);
}
