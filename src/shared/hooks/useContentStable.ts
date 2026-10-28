import { useMemo } from 'react';

/**
 * Returns `value`, keeping the previous object while its contents are unchanged.
 *
 * For values rebuilt on every update even when nothing in them changed, so memos and effects
 * downstream run only on a real change. Compares by JSON, so it's meant for small values.
 */
export function useContentStable<T>(value: T): T {
  const json = JSON.stringify(value) ?? 'null';
  // A copy rebuilt from the JSON, so the result changes exactly when the contents do.
  return useMemo(() => JSON.parse(json) as T, [json]);
}

export default useContentStable;
