import { useCallback, useState } from 'react';

export type SortValue = string | number | boolean | null | undefined;

export interface SortState<C extends string> {
  column: C;
  descending: boolean;
}

export type SortAccessors<T, C extends string> = Record<
  C,
  (row: T) => SortValue
>;

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** Numbers compare as numbers, everything else as text: numeric-aware ("2" before "10"), no case. */
export const compareValues = (a: SortValue, b: SortValue) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : collator.compare(String(a ?? ''), String(b ?? ''));

/** The rows ordered by one column. The sort is stable, so ties keep the order they came in. */
export function sortRows<T, C extends string>(
  rows: T[],
  sort: SortState<C>,
  accessors: SortAccessors<T, C>
): T[] {
  const get = accessors[sort.column];
  const direction = sort.descending ? -1 : 1;
  return [...rows].sort((a, b) => direction * compareValues(get(a), get(b)));
}

export interface Sorter<T, C extends string> {
  sort: SortState<C> | null;
  /** Ascending, then descending, then back to the default order */
  toggle: (column: C) => void;
  /** Back to the default order */
  clear: () => void;
  /** The rows in the chosen order, or untouched when there's no sort: the default view */
  apply: (rows: T[]) => T[];
}

/**
 * Click-to-sort state for one table. The rows you hand to `apply` are already in the table's
 * default order; clearing the sort returns to exactly that. Define `accessors` once, outside the
 * component, so `apply` only changes when the sort does.
 */
export function useSort<T, C extends string>(
  accessors: SortAccessors<T, C>
): Sorter<T, C> {
  const [sort, setSort] = useState<SortState<C> | null>(null);

  const toggle = useCallback((column: C) => {
    setSort((prev) => {
      if (prev?.column !== column) return { column, descending: false };
      return prev.descending ? null : { column, descending: true };
    });
  }, []);
  const clear = useCallback(() => setSort(null), []);
  const apply = useCallback(
    (rows: T[]) => (sort ? sortRows(rows, sort, accessors) : rows),
    [sort, accessors]
  );

  return { sort, toggle, clear, apply };
}
