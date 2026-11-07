import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
