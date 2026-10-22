import { useEffect, useState } from 'react';

/** Matches Bootstrap's `media-breakpoint-down(md)`: phones, and tablets in portrait. */
export const NARROW_SCREEN_QUERY = '(max-width: 767.98px)';

const matches = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(NARROW_SCREEN_QUERY).matches;

/**
 * True on screens narrower than Bootstrap's md breakpoint. Prefer CSS (`d-md-none` and friends)
 * where it can do the job; this is for components such as the Monaco editor that only take options.
 */
const useIsNarrowScreen = () => {
  const [isNarrow, setIsNarrow] = useState(matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(NARROW_SCREEN_QUERY);
    const onChange = () => setIsNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isNarrow;
};

export default useIsNarrowScreen;
