import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SortableTh } from './SortableTh';
import { SortAccessors, compareValues, sortRows, useSort } from './sorting';

interface Row {
  name: string;
  size: number;
}

const ROWS: Row[] = [
  { name: 'beta', size: 10 },
  { name: 'Alpha', size: 2 },
  { name: 'gamma', size: 33 },
];
const ACCESSORS: SortAccessors<Row, 'name' | 'size'> = {
  name: (r) => r.name,
  size: (r) => r.size,
};

describe('compareValues', () => {
  it('compares numbers numerically and text ignoring case, with numbers inside text in order', () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues('item2', 'item10')).toBeLessThan(0);
    expect(compareValues('alpha', 'Beta')).toBeLessThan(0);
    expect(compareValues(undefined, 'a')).toBeLessThan(0);
  });
});

describe('sortRows', () => {
  it('orders by the column in either direction, without touching the input', () => {
    const names = (descending: boolean) =>
      sortRows(ROWS, { column: 'name', descending }, ACCESSORS).map(
        (r) => r.name
      );
    expect(names(false)).toEqual(['Alpha', 'beta', 'gamma']);
    expect(names(true)).toEqual(['gamma', 'beta', 'Alpha']);
    expect(ROWS.map((r) => r.name)).toEqual(['beta', 'Alpha', 'gamma']);
  });
});

const Harness = () => {
  const sorter = useSort(ACCESSORS);
  return (
    <table>
      <thead>
        <tr>
          <SortableTh sorter={sorter} column="name" label="Name" />
          <SortableTh sorter={sorter} column="size" label="Size" />
        </tr>
      </thead>
      <tbody>
        {sorter.apply(ROWS).map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>{r.size}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
const sortOf = (label: string) =>
  screen.getByRole('columnheader', { name: new RegExp(`^${label}`) });

describe('SortableTh with useSort', () => {
  it('shows the default order until a heading is clicked', () => {
    render(<Harness />);
    expect(names()).toEqual(['beta', 'Alpha', 'gamma']);
    expect(sortOf('Name').getAttribute('aria-sort')).toBe('none');
    expect(screen.queryByRole('button', { name: /Remove the/ })).toBeNull();
  });

  it('sorts ascending, then descending, then back to the default order', () => {
    render(<Harness />);
    const heading = () => screen.getByRole('button', { name: /^Size/ });

    fireEvent.click(heading());
    expect(names()).toEqual(['Alpha', 'beta', 'gamma']);
    expect(sortOf('Size').getAttribute('aria-sort')).toBe('ascending');

    fireEvent.click(heading());
    expect(names()).toEqual(['gamma', 'beta', 'Alpha']);
    expect(sortOf('Size').getAttribute('aria-sort')).toBe('descending');

    fireEvent.click(heading());
    expect(names()).toEqual(['beta', 'Alpha', 'gamma']);
    expect(sortOf('Size').getAttribute('aria-sort')).toBe('none');
  });

  it('removes the sort from the × beside the sorted column, and only that column has one', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    expect(names()).toEqual(['Alpha', 'beta', 'gamma']);
    // Only the sorted column offers to remove its sort
    expect(screen.getAllByRole('button', { name: /Remove the/ })).toHaveLength(
      1
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove the Name sort' })
    );
    expect(names()).toEqual(['beta', 'Alpha', 'gamma']);
    expect(screen.queryByRole('button', { name: /Remove the/ })).toBeNull();
  });

  it('moves the sort to another column when its heading is clicked', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Size/ }));
    expect(sortOf('Name').getAttribute('aria-sort')).toBe('none');
    expect(sortOf('Size').getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('compareValues with mixed kinds', () => {
  it('puts numbers before text and keeps the order transitive', () => {
    const rows = ['-5', -2, 'b', -10, 'a', 3];
    const sorted = [...rows].sort(compareValues);
    expect(sorted).toEqual([-10, -2, 3, '-5', 'a', 'b']);
  });
});
