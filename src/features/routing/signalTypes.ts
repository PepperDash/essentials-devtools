/**
 * Signal-type flag algebra for routing.
 *
 * On the backend `eRoutingSignalType` is a [Flags] enum (Audio=1, Video=2, AudioVideo=3, Usb=8)
 * and the wire carries its `ToString()`. But plugin and legacy devices contribute their own
 * enum names too - "Audio, SecondaryAudio", "UsbOutput, UsbInput", "UsbInput" are all observed in
 * the field - so we cannot assume a fixed numeric bitmask. Instead we model a signal type as a
 * set of atom names, which degrades gracefully: an unrecognized token is simply an atom that only
 * ever matches itself.
 *
 * The one asymmetry that matters, and the reason this module exists: matching is "contains all",
 * mirroring C#'s `port.Type.HasFlag(requested)`. An AudioVideo port satisfies a Video request; a
 * Video port does NOT satisfy an AudioVideo request.
 */

/**
 * Names that expand into more than one atom. Only AudioVideo is a real composite in
 * `eRoutingSignalType`; comma-separated flag strings are decomposed structurally instead.
 */
const COMPOSITES: Record<string, readonly string[]> = {
  AudioVideo: ["Audio", "Video"],
};

/**
 * Parses a signal-type string into its set of atoms, expanding known composite names.
 * Insertion order follows the source string, so `formatSignalFlags` round-trips it.
 *
 * "AudioVideo" -> {Audio, Video}; "Audio, SecondaryAudio" -> {Audio, SecondaryAudio}
 */
function parseSignalFlags(signalType: string | null | undefined): ReadonlySet<string> {
  const atoms = new Set<string>();
  if (!signalType) return atoms;

  for (const token of signalType.split(",")) {
    const name = token.trim();
    if (!name) continue;
    const expanded = COMPOSITES[name];
    if (expanded) {
      for (const atom of expanded) atoms.add(atom);
    } else {
      atoms.add(name);
    }
  }
  return atoms;
}

/**
 * Renders a set of atoms back to a wire-compatible signal-type string, collapsing to a composite
 * name where one matches exactly so the result round-trips through C# `Enum.TryParse`.
 *
 * {Audio, Video} -> "AudioVideo"; {Video} -> "Video"
 */
function formatSignalFlags(flags: ReadonlySet<string>): string {
  for (const [name, atoms] of Object.entries(COMPOSITES)) {
    if (atoms.length === flags.size && atoms.every((a) => flags.has(a))) return name;
  }
  return Array.from(flags).join(", ");
}

/**
 * True when `have` includes every atom of `want` - the equivalent of C# `have.HasFlag(want)`.
 * Deliberately asymmetric: containsAll(AudioVideo, Video) is true, containsAll(Video, AudioVideo)
 * is false. An empty `want` is vacuously satisfied, matching `(have & 0) == 0`.
 */
function flagsContainAll(have: ReadonlySet<string>, want: ReadonlySet<string>): boolean {
  for (const atom of want) {
    if (!have.has(atom)) return false;
  }
  return true;
}

/** True when the two flag sets share at least one atom. */
function flagsIntersect(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  // Iterate the smaller set.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const atom of small) {
    if (large.has(atom)) return true;
  }
  return false;
}

/** The atoms of a signal-type string, in source order. */
function atomsOf(signalType: string | null | undefined): string[] {
  return Array.from(parseSignalFlags(signalType));
}

/**
 * The signal types a user may select for a given port: the port's own full type first, then each
 * individual atom as a breakaway option. A port carrying a single atom yields one option, which
 * lets the popover skip its signal-type step entirely.
 *
 * "AudioVideo" -> ["AudioVideo", "Audio", "Video"]; "Video" -> ["Video"]
 */
function signalTypeOptionsForPort(portSignalType: string | null | undefined): string[] {
  if (!portSignalType) return [];
  const atoms = atomsOf(portSignalType);
  if (atoms.length <= 1) return [portSignalType];
  return [portSignalType, ...atoms];
}

/**
 * True when a port can carry the requested signal type - the client-side mirror of the backend's
 * `(port.Type & requested) == requested` check, so the UI never offers a combination the endpoint
 * would reject with `signalTypeNotSupportedByPort`.
 */
function portSupportsSignalType(
  portSignalType: string | null | undefined,
  requested: string,
): boolean {
  return flagsContainAll(parseSignalFlags(portSignalType), parseSignalFlags(requested));
}

export {
  atomsOf,
  flagsContainAll,
  flagsIntersect,
  formatSignalFlags,
  parseSignalFlags,
  portSupportsSignalType,
  signalTypeOptionsForPort,
};
