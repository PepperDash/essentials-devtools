import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

export const FilterSearchText = ({
  disabled,
  placeholder,
  debounceMs = 1000,
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
  /** Handles search text change, after the debounce (1s unless a page asks for less) */
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
    }, debounceMs);
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
    <div className="filter-search">
      <svg
        className="filter-search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <FormControl
        className="filter-search-input"
        size="sm"
        type="search"
        value={searchText}
        onChange={searchTextChange}
        disabled={disabled}
        placeholder={placeholder ?? 'Search'}
        aria-label={placeholder ?? 'Search'}
      />
    </div>
  );
};

type FilterSearchTextBaseProps = {
  disabled?: boolean;
  placeholder?: string;
  /** How long typing must pause before the change is applied. Lower it for filtering that is
   *  done in the browser; the default suits searches that hit the network. */
  debounceMs?: number;
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
