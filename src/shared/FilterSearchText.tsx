import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

export const FilterSearchText = ({
  disabled,
  placeholder,
  value: controlledValue,
  onChangeValue,
}: FilterSearchTextProps) => {
  /* HOOKS ***********************************************************/
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PARAM = 'searchText';
  const [searchParams, setSearchParams] = useSearchParams();
  // The value from outside: the prop in controlled mode, otherwise the URL params
  const externalText = onChangeValue
    ? (controlledValue ?? '')
    : searchParams.getAll(PARAM).join(' ');
  const [searchText, setSearchText] = useState<string>(externalText);
  const [syncedText, setSyncedText] = useState(externalText);

  /* FUNCTIONS *******************************************************/
  /** Handles search text change, after 1s debounce */
  function searchTextChange(change: ChangeEvent<HTMLInputElement>) {
    setSearchText(change.target.value);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const val: string = change.target.value.trim();

      if (onChangeValue) {
        // Controlled (Redux) mode — call the provided callback
        onChangeValue(val);
      } else {
        // URL params mode (default)
        const tokens = val.split(' ').filter(Boolean);
        searchParams.delete(PARAM);
        if (val.length) tokens.forEach((t) => searchParams.append(PARAM, t));
        setSearchParams(searchParams);
      }
    }, 1000);
  }

  /* EFFECTS *********************************************************/
  /** Clear any pending debounce timer on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Replace the draft whenever the outside value changes. Done during render rather than in an
   *  effect, so the input never paints the stale value first. **/
  if (externalText !== syncedText) {
    setSyncedText(externalText);
    setSearchText(externalText);
  }

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

type FilterSearchTextBaseProps = {
  disabled?: boolean;
  placeholder?: string;
};
type FilterSearchTextControlledProps = FilterSearchTextBaseProps & {
  /** Controlled value (Redux mode). */
  value: string;
  onChangeValue: (val: string) => void;
};
type FilterSearchTextUncontrolledProps = FilterSearchTextBaseProps & {
  value?: undefined;
  onChangeValue?: undefined;
};

type FilterSearchTextProps =
  FilterSearchTextControlledProps | FilterSearchTextUncontrolledProps;
