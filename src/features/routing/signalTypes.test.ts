import { describe, expect, it } from 'vitest';

import {
  atomsOf,
  flagsContainAll,
  flagsIntersect,
  formatSignalFlags,
  parseSignalFlags,
  portSupportsSignalType,
  signalTypeOptionsForPort,
} from './signalTypes';

/** Every signal-type string observed coming off a real processor, plus an unknown one. */
const REAL_WORLD = [
  'AudioVideo',
  'Video',
  'Audio',
  'Audio, SecondaryAudio',
  'UsbOutput, UsbInput',
  'UsbOutput',
  'UsbInput',
  'Usb',
  'Foo',
];

describe('parseSignalFlags', () => {
  it('expands the AudioVideo composite', () => {
    expect(Array.from(parseSignalFlags('AudioVideo'))).toEqual([
      'Audio',
      'Video',
    ]);
  });

  it('splits comma-separated flag strings, preserving source order', () => {
    expect(Array.from(parseSignalFlags('UsbOutput, UsbInput'))).toEqual([
      'UsbOutput',
      'UsbInput',
    ]);
  });

  it('tolerates whitespace variations', () => {
    expect(Array.from(parseSignalFlags('Audio,SecondaryAudio'))).toEqual([
      'Audio',
      'SecondaryAudio',
    ]);
    expect(Array.from(parseSignalFlags('  Audio ,  Video '))).toEqual([
      'Audio',
      'Video',
    ]);
  });

  it('passes unknown tokens through as their own atom', () => {
    expect(Array.from(parseSignalFlags('Foo'))).toEqual(['Foo']);
  });

  it('returns an empty set for empty, null and undefined input', () => {
    expect(parseSignalFlags('').size).toBe(0);
    expect(parseSignalFlags(null).size).toBe(0);
    expect(parseSignalFlags(undefined).size).toBe(0);
  });
});

describe('formatSignalFlags', () => {
  it('collapses {Audio, Video} back to the AudioVideo composite', () => {
    expect(formatSignalFlags(parseSignalFlags('AudioVideo'))).toBe(
      'AudioVideo'
    );
  });

  it.each(REAL_WORLD)('round-trips %s', (signalType) => {
    expect(formatSignalFlags(parseSignalFlags(signalType))).toBe(signalType);
  });

  it('does not collapse a partial composite', () => {
    expect(formatSignalFlags(parseSignalFlags('Audio'))).toBe('Audio');
  });
});

describe('flagsContainAll', () => {
  // The asymmetry this whole module exists for.
  it('lets an AudioVideo port satisfy a Video request', () => {
    expect(
      flagsContainAll(parseSignalFlags('AudioVideo'), parseSignalFlags('Video'))
    ).toBe(true);
  });

  it('does not let a Video port satisfy an AudioVideo request', () => {
    expect(
      flagsContainAll(parseSignalFlags('Video'), parseSignalFlags('AudioVideo'))
    ).toBe(false);
  });

  it('is reflexive for every real-world value', () => {
    for (const s of REAL_WORLD) {
      expect(flagsContainAll(parseSignalFlags(s), parseSignalFlags(s))).toBe(
        true
      );
    }
  });

  it('keeps Usb isolated from audio and video', () => {
    expect(
      flagsContainAll(parseSignalFlags('AudioVideo'), parseSignalFlags('Usb'))
    ).toBe(false);
    expect(
      flagsContainAll(parseSignalFlags('Usb'), parseSignalFlags('Audio'))
    ).toBe(false);
  });

  it('treats an empty request as vacuously satisfied, matching (have & 0) == 0', () => {
    expect(
      flagsContainAll(parseSignalFlags('Video'), parseSignalFlags(''))
    ).toBe(true);
  });
});

describe('flagsIntersect', () => {
  it('is true for overlapping sets and symmetric', () => {
    const av = parseSignalFlags('AudioVideo');
    const a = parseSignalFlags('Audio, SecondaryAudio');
    expect(flagsIntersect(av, a)).toBe(true);
    expect(flagsIntersect(a, av)).toBe(true);
  });

  it('is false for disjoint sets', () => {
    expect(
      flagsIntersect(parseSignalFlags('Video'), parseSignalFlags('Audio'))
    ).toBe(false);
    expect(
      flagsIntersect(parseSignalFlags('Video'), parseSignalFlags(''))
    ).toBe(false);
  });
});

describe('signalTypeOptionsForPort', () => {
  it('offers the full type plus each breakaway atom', () => {
    expect(signalTypeOptionsForPort('AudioVideo')).toEqual([
      'AudioVideo',
      'Audio',
      'Video',
    ]);
  });

  it('offers a single option for a single-atom port, so the picker can be skipped', () => {
    expect(signalTypeOptionsForPort('Video')).toEqual(['Video']);
    expect(signalTypeOptionsForPort('Foo')).toEqual(['Foo']);
  });

  it('decomposes plugin flag strings without reordering them', () => {
    expect(signalTypeOptionsForPort('UsbOutput, UsbInput')).toEqual([
      'UsbOutput, UsbInput',
      'UsbOutput',
      'UsbInput',
    ]);
  });

  it('returns nothing for a port with no declared type', () => {
    expect(signalTypeOptionsForPort('')).toEqual([]);
    expect(signalTypeOptionsForPort(undefined)).toEqual([]);
  });

  it('only ever offers options the port actually supports', () => {
    for (const portType of REAL_WORLD) {
      for (const option of signalTypeOptionsForPort(portType)) {
        expect(portSupportsSignalType(portType, option)).toBe(true);
      }
    }
  });
});

describe('atomsOf', () => {
  it('returns atoms in source order', () => {
    expect(atomsOf('AudioVideo')).toEqual(['Audio', 'Video']);
    expect(atomsOf('UsbOutput, UsbInput')).toEqual(['UsbOutput', 'UsbInput']);
  });
});
