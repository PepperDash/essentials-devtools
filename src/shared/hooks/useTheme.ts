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
  return (
    explicitChoice ?? readStored() ?? (systemPrefersDark() ? 'dark' : 'light')
  );
}

const listeners = new Set<() => void>();

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  listeners.forEach((l) => l());
}

// Remembered in memory too, so a blocked localStorage doesn't lose the choice mid-visit
let explicitChoice: Theme | null = null;

export function setTheme(theme: Theme) {
  explicitChoice = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit
  }
  apply(theme);
}

// One pair of window listeners for all subscribers, attached with the first and removed with the
// last, rather than a pair per mounted toggle
let detach: (() => void) | null = null;

function attach() {
  const mq =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY)
      : null;
  // Follow the operating system until the person picks a theme themselves
  const onSystemChange = () => {
    if (!explicitChoice && !readStored()) apply(resolveTheme());
  };
  // The choice was changed (or cleared) in another tab: follow it. A null key means storage was
  // cleared wholesale.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    explicitChoice = readStored();
    apply(resolveTheme());
  };
  mq?.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    mq?.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  detach ??= attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detach?.();
      detach = null;
    }
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
