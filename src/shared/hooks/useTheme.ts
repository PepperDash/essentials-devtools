import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'essentials-devtools-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Storage can throw (private windows, blocked site data), so every access is guarded
function readStored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

const systemPrefersDark = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia(DARK_QUERY).matches;

// The person's explicit choice, else the operating system's. Keep in step with the inline script
// in index.html, which sets the attribute before first paint.
export function resolveTheme(): Theme {
  return readStored() ?? (systemPrefersDark() ? 'dark' : 'light');
}

const listeners = new Set<() => void>();

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  listeners.forEach((l) => l());
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit
  }
  apply(theme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow the operating system until the person picks a theme themselves
  const mq =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY)
      : null;
  const onSystemChange = () => {
    if (!readStored()) apply(resolveTheme());
  };
  mq?.addEventListener('change', onSystemChange);
  return () => {
    listeners.delete(listener);
    mq?.removeEventListener('change', onSystemChange);
  };
}

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute('data-bs-theme') === 'dark'
    ? 'dark'
    : 'light';

export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'light');
  return {
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}
