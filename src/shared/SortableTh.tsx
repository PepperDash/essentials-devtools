import { CSSProperties } from 'react';
import { Sorter } from './sorting';

interface SortableThProps<T, C extends string> {
  sorter: Sorter<T, C>;
  column: C;
  label: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A column heading that sorts. Click to sort by it and again to reverse. While it's the active sort
 * a × beside it removes the sort, and a third click does the same.
 */
export const SortableTh = <T, C extends string>({
  sorter,
  column,
  label,
  className,
  style,
}: SortableThProps<T, C>) => {
  const active = sorter.sort?.column === column;
  const descending = active && sorter.sort?.descending;
  return (
    <th
      className={className}
      style={style}
      aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
    >
      <span className="sort-control">
        <button
          type="button"
          className="sort-header"
          onClick={() => sorter.toggle(column)}
        >
          {label}
          <span className="sort-indicator" aria-hidden="true">
            {active ? (descending ? '▼' : '▲') : ''}
          </span>
        </button>
        {active && (
          <button
            type="button"
            className="sort-clear"
            aria-label={`Remove the ${label} sort`}
            title="Remove sort (default order)"
            onClick={sorter.clear}
          >
            ×
          </button>
        )}
      </span>
    </th>
  );
};
