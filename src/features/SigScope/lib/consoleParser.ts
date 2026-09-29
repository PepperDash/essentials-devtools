/**
 * Parsing for the processor console output that DBGSIGNAL streams.
 * Ported from SigScope's extension-side ProcessorClient; the SSH channel is replaced
 * by the Essentials console session WebSocket, whose frames can split lines anywhere.
 *
 * Stream format:
 *   4-Series (with timestamp):
 *     {timestamp}:{hex_signal_num}:{program}={value}
 *   3-Series (no timestamp):
 *     {hex_signal_num}:{program}={value}
 *
 *   Examples:
 *     102323398:00001D03:1=1          digital HIGH
 *     102323398:00001D03:1=0          digital LOW
 *     102323398:00001A08:1=[51]       analog value 51 (brackets around value)
 *     102323398:00000B35:1=           serial signal, empty string
 *     102323398:00000B35:1=[61][62][63]  serial signal "abc" (hex bytes in brackets)
 */

// Format: {decimal_timestamp}:{8-hex-sig}:{program}={value}
const SIGNAL_LINE_RE  = /^(?:\d+:)?([0-9A-Fa-f]+):(\d+)=(.*)$/
const ANALOG_VALUE_RE = /^\[(\d+)\]$/
const SERIAL_BYTES_RE = /^(?:\[[0-9A-Fa-f]{2}\])+$/
const SERIAL_BYTE_RE  = /\[([0-9A-Fa-f]{2})\]/g

// Program-restart console banners. Unanchored on purpose — real output has stray
// characters glued onto these lines (e.g. a leading "." left over from the
// preceding dot-progress indicator: ".**Program Stopped:1**").
const PROGRAM_STOPPED_RE     = /\*\*Program Stopped:(\d+)\*\*/
const PROGRAM_INITIALIZED_RE = /Program Initialized:(\d+)\./

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x01\x03]/g

/**
 * Parse a dbgsignal output line into [sigNum, value] or null.
 *
 * Analog values arrive as "[N]" (decimal) — brackets stripped → bare integer string.
 * Serial values arrive as "[61][62][63]" (hex bytes) → joined flat hex string "616263".
 */
export function parseSignalLine(line: string): [number, string] | null {
  const cleaned = line.trim().replace(CONTROL_CHARS_RE, '')
  const m = SIGNAL_LINE_RE.exec(cleaned)
  if (!m) return null

  const [, sigHex, , rawValue] = m
  const sigNum = parseInt(sigHex, 16)
  if (isNaN(sigNum)) return null

  // Serial multi-byte: "[61][62][63]" -> "616263"
  if (SERIAL_BYTES_RE.test(rawValue)) {
    const bytes = [...rawValue.matchAll(SERIAL_BYTE_RE)].map(b => b[1]).join('')
    return [sigNum, bytes]
  }

  // Analog single value: "[51]" -> "51"
  const analogMatch = ANALOG_VALUE_RE.exec(rawValue)
  const value = analogMatch ? analogMatch[1] : rawValue
  return [sigNum, value]
}

export type ConsoleLine =
  | { kind: 'signal'; num: number; value: string }
  | { kind: 'programStopped'; program: number }
  | { kind: 'programInitialized'; program: number }
  | { kind: 'other'; text: string }

/** Classify one complete console line. */
export function classifyLine(line: string): ConsoleLine | null {
  const signal = parseSignalLine(line)
  if (signal) return { kind: 'signal', num: signal[0], value: signal[1] }

  const stripped = line.trim().replace(CONTROL_CHARS_RE, '')
  if (!stripped) return null

  const stopped = PROGRAM_STOPPED_RE.exec(stripped)
  if (stopped) return { kind: 'programStopped', program: Number(stopped[1]) }

  const initialized = PROGRAM_INITIALIZED_RE.exec(stripped)
  if (initialized) return { kind: 'programInitialized', program: Number(initialized[1]) }

  return { kind: 'other', text: stripped }
}

/**
 * Splits streamed console text into complete lines, holding a trailing partial
 * line until the next chunk completes it.
 */
export class LineSplitter {
  private buf = ''

  push(chunk: string): string[] {
    this.buf += chunk
    const lines = this.buf.split(/\r\n|\n|\r/)
    this.buf = lines.pop() ?? ''
    return lines
  }

  reset(): void {
    this.buf = ''
  }
}
