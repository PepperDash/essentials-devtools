import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useIsNarrowScreen, { NARROW_SCREEN_QUERY } from './useIsNarrowScreen';

// A matchMedia stand-in whose result the test can change, as rotating a phone would
const stubMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<() => void>();
  const query = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    listeners,
    set: (value: boolean) => {
      matches = value;
      listeners.forEach((fn) => fn());
    },
  };
};

describe('useIsNarrowScreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the md breakpoint query and follows changes to it', () => {
    const media = stubMatchMedia(true);
    const { result, unmount } = renderHook(() => useIsNarrowScreen());

    expect(media.matchMedia).toHaveBeenCalledWith(NARROW_SCREEN_QUERY);
    expect(result.current).toBe(true);

    act(() => media.set(false));
    expect(result.current).toBe(false);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('treats a browser without matchMedia as a wide screen', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useIsNarrowScreen());
    expect(result.current).toBe(false);
  });
});
