import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import SuggestInput from './SuggestInput';

const suggestions = [
  { value: 'audio-room', label: 'Program Audio' },
  { value: 'display-1', label: 'Left Display' },
  { value: 'display-2', label: 'Right Display' },
];

const Harness = () => {
  const [value, setValue] = useState('');
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <SuggestInput
        value={value}
        onChange={setValue}
        suggestions={suggestions}
      />
    </form>
  );
};

const field = () => screen.getByRole('combobox') as HTMLInputElement;

describe('SuggestInput', () => {
  it('offers the suggestions when focused and picks one on click', () => {
    render(<Harness />);

    fireEvent.focus(field());
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.click(screen.getByRole('option', { name: /display-2/ }));
    expect(field().value).toBe('display-2');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('narrows the list by key or description as you type', () => {
    render(<Harness />);

    fireEvent.change(field(), { target: { value: 'right' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('display-2');
  });

  it('keeps a value that is not in the list', () => {
    render(<Harness />);

    fireEvent.change(field(), { target: { value: 'something-else' } });
    expect(field().value).toBe('something-else');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('moves with the arrow keys and picks with Enter', () => {
    render(<Harness />);

    fireEvent.focus(field());
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(field().value).toBe('display-1');
  });

  it('clears what was entered with the clear button, and shows it only when there is text', () => {
    render(<Harness />);

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    fireEvent.change(field(), { target: { value: 'display-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(field().value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
