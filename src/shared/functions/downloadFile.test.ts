import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  downloadJson,
  downloadText,
  timestampedFilename,
} from './downloadFile';

// jsdom implements neither of these, so they have to be installed before the helper runs.
// Typed with its signature so `mock.calls[0][0]` is the Blob rather than an empty tuple.
const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(
  () => 'blob:mock-url'
);
const revokeObjectURL = vi.fn<(url: string) => void>(() => undefined);

let clicked: HTMLAnchorElement[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  clicked = [];
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();

  Object.defineProperty(URL, 'createObjectURL', {
    value: createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: revokeObjectURL,
    configurable: true,
  });

  // jsdom's HTMLAnchorElement.click() would try to navigate; record the call instead.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clicked.push(this);
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('downloadText', () => {
  it('clicks an anchor carrying the filename', () => {
    downloadText('notes.txt', 'hello');

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('notes.txt');
    expect(clicked[0].href).toContain('blob:mock-url');
  });

  it('puts the anchor in the document before clicking, so Firefox honours it', () => {
    downloadText('notes.txt', 'hello');
    // The recorded anchor was attached at click time; cleanup happens on the timer below.
    expect(clicked[0].isConnected).toBe(true);
  });

  it('builds the blob with the requested media type', () => {
    downloadText('notes.txt', 'hello', 'text/csv');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv');
  });

  it('defaults to text/plain', () => {
    downloadText('notes.txt', 'hello');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain');
  });

  // Revoking inline cancels the download in some browsers, so cleanup is deferred a tick.
  it('defers cleanup rather than revoking before the click is dispatched', () => {
    downloadText('notes.txt', 'hello');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(clicked[0].isConnected).toBe(true);

    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(clicked[0].isConnected).toBe(false);
  });

  it('leaves no anchors behind after several downloads', () => {
    downloadText('a.txt', 'a');
    downloadText('b.txt', 'b');
    vi.runAllTimers();

    expect(document.querySelectorAll('a')).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe('downloadJson', () => {
  it('pretty-prints the payload as application/json', async () => {
    downloadJson('data.json', { b: 2, a: 1 });

    expect(clicked[0].download).toBe('data.json');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    await expect(blob.text()).resolves.toBe('{\n  "b": 2,\n  "a": 1\n}');
  });
});

describe('timestampedFilename', () => {
  it('stamps the current date and the given extension', () => {
    vi.setSystemTime(new Date('2026-09-16T18:30:00Z'));
    expect(timestampedFilename('secrets-template-app01', 'json')).toBe(
      'secrets-template-app01-2026-09-16.json'
    );
  });
});
