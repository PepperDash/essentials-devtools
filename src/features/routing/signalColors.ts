/**
 * Colors used to distinguish routing signal types across the Routing diagram - tie-line edges,
 * the signal-type filter buttons, internal route curves inside device nodes, and the route
 * popover's signal-type picker.
 *
 * Keys are the raw `signalType` strings that come off the wire, which are C# `ToString()` of a
 * [Flags] enum - so composite values like "Audio, SecondaryAudio" appear verbatim and get their
 * own entry rather than being decomposed.
 */
const SIGNAL_COLORS: Record<string, string> = {
  AudioVideo: "#6f42c1",
  Video: "#0d6efd",
  Audio: "#dc3545",
  "Audio, SecondaryAudio": "#dc3545",
  "UsbOutput, UsbInput": "#fd7e14",
  UsbOutput: "#fd7e14",
  UsbInput: "#fd7e14",
};

const FALLBACK_COLOR = "#adb5bd";

/** Returns the display color for a signal type, falling back to grey for unrecognized values. */
function signalColor(signalType: string): string {
  return SIGNAL_COLORS[signalType] ?? FALLBACK_COLOR;
}

export { FALLBACK_COLOR, SIGNAL_COLORS, signalColor };
