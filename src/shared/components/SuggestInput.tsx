import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';

export interface Suggestion {
  value: string;
  /** A description shown beside the value, such as a device's name */
  label?: string;
}

const MAX_SHOWN = 50;

/**
 * A text field with a list of suggestions to pick from. Anything can still be typed: the list only
 * helps. Typing narrows the list; Up and Down move through it, Enter picks, Escape closes it.
 */
const SuggestInput = ({
  value,
  onChange,
  suggestions,
  placeholder,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const terms = value.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return suggestions;
    return suggestions.filter((s) => {
      const haystack = `${s.value} ${s.label ?? ''}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [suggestions, value]);

  const shown = matches.slice(0, MAX_SHOWN);
  const isOpen = open && shown.length > 0;

  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const pick = (item: Suggestion) => {
    onChange(item.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (shown.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + shown.length) % shown.length);
    } else if (e.key === 'Enter' && isOpen && active >= 0) {
      // Pick the highlighted suggestion rather than submitting the form around the field. The
      // list can shrink under a highlight (new data loaded), so clear a stale index instead.
      e.preventDefault();
      const item = shown[active];
      if (item) pick(item);
      else setActive(-1);
    } else if (e.key === 'Escape' && isOpen) {
      // Close the list only, not the panel the field sits in
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="suggest">
      <Form.Control
        ref={inputRef}
        size="sm"
        id={id}
        className={value ? 'suggest-input-clearable' : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && active >= 0 ? `${listId}-${active}` : undefined
        }
      />
      {value && (
        <button
          type="button"
          className="suggest-clear"
          aria-label="Clear"
          title="Clear"
          // Keep focus in the field, and don't let the click close the list before it's handled
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange('');
            setActive(-1);
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="suggest-list"
          // Keep focus in the field so choosing an item doesn't blur (and close) the list first
          onMouseDown={(e) => e.preventDefault()}
        >
          {shown.map((item, index) => (
            <li
              key={item.value}
              id={`${listId}-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === active}
              className={`suggest-item${index === active ? ' suggest-item-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(item)}
            >
              <span className="suggest-value">{item.value}</span>
              {item.label && (
                <span className="suggest-label">{item.label}</span>
              )}
            </li>
          ))}
          {matches.length > shown.length && (
            <li className="suggest-more" aria-hidden="true">
              {matches.length - shown.length} more: keep typing to narrow
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SuggestInput;
