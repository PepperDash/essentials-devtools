import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// index.html sets <base> with an inline script before any bundle loads, so it can't import
// hostPaths. Run that exact script against sample paths to keep the two in step.
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

const baseFor = (pathname: string): string | null => {
  const added: { href?: string }[] = [];
  const fakeDocument = {
    createElement: () => ({}) as { href?: string },
    head: { appendChild: (el: { href?: string }) => added.push(el) },
  };
  new Function('window', 'document', script)(
    { location: { pathname } },
    fakeDocument
  );
  return added[0]?.href ?? null;
};

describe('index.html <base> script', () => {
  it('finds the inline script', () => {
    expect(script).toContain('/cws');
  });

  it.each([
    ['/cws/debug/', '/cws/debug/'],
    ['/cws/debug/app01/versions', '/cws/debug/'],
    [
      '/VirtualControl/Rooms/DEMOV3/cws/debug/',
      '/VirtualControl/Rooms/DEMOV3/cws/debug/',
    ],
    [
      '/VirtualControl/Rooms/DEMOV3/cws/debug/DEMOV3/routing',
      '/VirtualControl/Rooms/DEMOV3/cws/debug/',
    ],
    // A room named CWS: the first /cws/ is the room ID, not the mount
    [
      '/VirtualControl/Rooms/CWS/cws/debug/',
      '/VirtualControl/Rooms/CWS/cws/debug/',
    ],
    [
      '/VirtualControl/Rooms/cws/cws/debug/cws/versions',
      '/VirtualControl/Rooms/cws/cws/debug/',
    ],
  ])('sets the base for %s to %s', (pathname, expected) => {
    expect(baseFor(pathname)).toBe(expected);
  });

  it('leaves the base alone outside the /cws/debug mount', () => {
    expect(baseFor('/')).toBeNull();
  });
});
