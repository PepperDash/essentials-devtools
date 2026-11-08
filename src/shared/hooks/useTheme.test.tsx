import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '../components/ThemeToggle';
import { resolveTheme } from './useTheme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('uses a stored choice over the system preference', () => {
    window.localStorage.setItem('essentials-devtools-theme', 'dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    window.localStorage.setItem('essentials-devtools-theme', 'purple');
    expect(['light', 'dark']).toContain(resolveTheme());
  });

  it('toggles the theme, applies it to the page and remembers it', () => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(window.localStorage.getItem('essentials-devtools-theme')).toBe(
      'dark'
    );
    expect(
      screen
        .getByRole('switch', { name: 'Dark theme' })
        .getAttribute('aria-checked')
    ).toBe('true');
  });

  it('follows a theme chosen in another tab', () => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    render(<ThemeToggle />);

    act(() => {
      window.localStorage.setItem('essentials-devtools-theme', 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'essentials-devtools-theme' })
      );
    });

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('listens to the window once however many toggles are mounted', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const storageCalls = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'storage').length;

    const first = render(<ThemeToggle />);
    const second = render(<ThemeToggle />);
    expect(storageCalls(add)).toBe(1);

    first.unmount();
    expect(storageCalls(remove)).toBe(0);
    second.unmount();
    expect(storageCalls(remove)).toBe(1);

    add.mockRestore();
    remove.mockRestore();
  });
});
