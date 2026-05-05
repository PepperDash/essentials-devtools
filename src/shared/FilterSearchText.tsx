import { ChangeEvent, useEffect, useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

export const FilterSearchText = ({
  disabled,
  placeholder,
  value: controlledValue,
  onChangeValue,
}: FilterSearchTextProps) => {
  /* HOOKS ***********************************************************/
  /** Debounce timer for search box */
  let searchTimerHandle: NodeJS.Timeout;
  const PARAM = 'searchText';
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState<string>(controlledValue ?? '');

  /* FUNCTIONS *******************************************************/
  /** Handles search text change, after 1s debounce */
  function searchTextChange(change: ChangeEvent<HTMLInputElement>) {
    setSearchText(change.target.value);

    if (searchTimerHandle) clearTimeout(searchTimerHandle);
    searchTimerHandle = setTimeout(() => {
      const val: string = change.target.value.trim();

      if (onChangeValue) {
        // Controlled (Redux) mode — call the provided callback
        onChangeValue(val);
      } else {
        // URL params mode (default)
        const tokens = val.split(' ');
        searchParams.delete(PARAM);
        if (val.length) tokens.forEach((t) => searchParams.append(PARAM, t));
        setSearchParams(searchParams);
      }
    }, 1000);
  }

  /* EFFECTS *********************************************************/
  /** In URL-params mode, sync local state from params. In controlled mode, sync from prop. **/
  useEffect(() => {
    if (onChangeValue) {
      setSearchText(controlledValue ?? '');
    } else {
      setSearchText(searchParams.getAll(PARAM).join(' '));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue, searchParams]);

  /* RENDER **********************************************************/
  return (
    <div className="d-flex justify-content-between align-items-center bg-white border border-secondary border-0 rounded pe-1">
      <FormControl
        className="border-0"
        size="sm"
        value={searchText}
        onChange={searchTextChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
};

interface FilterSearchTextProps {
  disabled?: boolean;
  placeholder?: string;
  /** Controlled value (Redux mode). When provided, `onChangeValue` is also required. */
  value?: string;
  /** Called with the debounced text when in controlled mode. */
  onChangeValue?: (val: string) => void;
}
