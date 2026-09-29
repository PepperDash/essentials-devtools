/**
 * Parser for Crestron SIMPL Windows .sig files.
 * Browser port of SigScope's extension-side parser (Node Buffer replaced with Uint8Array/DataView).
 *
 * File format (LOGOSSIG001.000):
 *   Header: "[LOGOSSIG001.000]"  (ASCII, optional \n after ']')
 *   Records (variable-length, byte-stream, NOT necessarily 2-byte aligned):
 *     [2-byte record_size LE]    total bytes in record INCLUDING this field
 *     [UTF-16LE signal name]     (record_size - 8) / 2 characters, no null
 *     [2-byte signal_num LE]     join number used in dbgsignal commands
 *     [2-byte null = 00 00]      null terminator
 *     [2-byte type_flags LE]     0x0000=digital, 0x0701=analog,
 *                                0x0702=serial-in, 0x0300=serial-out
 *
 * Records are scanned by trying each byte position; invalid records are skipped.
 */

export enum SigType {
  DIGITAL = 'digital',
  ANALOG  = 'analog',
  SERIAL  = 'serial',
  UNKNOWN = 'unknown',
}

/**
 * Decodes a hex string as latin1 text, matching Node's Buffer.from(hex, 'hex'):
 * decoding stops at the first pair that isn't valid hex.
 */
function hexToLatin1(hex: string): string {
  let out = ''
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const pair = hex.slice(i, i + 2)
    if (!/^[0-9A-Fa-f]{2}$/.test(pair)) break
    out += String.fromCharCode(parseInt(pair, 16))
  }
  return out
}

export class Signal {
  num: number
  name: string
  sig_type: SigType
  type_flags: number

  constructor(num: number, name: string, sig_type: SigType, type_flags: number) {
    this.num = num
    this.name = name
    this.sig_type = sig_type
    this.type_flags = type_flags
  }

  /** Display name — includes S- path for :: module signals; full name otherwise. */
  get display_name(): string {
    if (this.name.startsWith('::')) {
      // ::SignalName:S-4.3.4.2.00001234  ->  SignalName  S-4.3.4.2
      const parts = this.name.slice(2).split(':')
      const sigName = parts[0] ?? this.name
      const path = (parts[1] ?? '').replace(/\.[0-9a-fA-F]{8}$/, '')
      return path ? `${sigName}  ${path}` : sigName
    }
    return this.name
  }

  /** Upgrade UNKNOWN type based on first observed value. */
  resolve_type_from_value(raw: string): void {
    if (this.sig_type !== SigType.UNKNOWN || !raw) return
    const v = parseInt(raw, 10)
    if (!isNaN(v)) {
      this.sig_type = v <= 1 ? SigType.DIGITAL : SigType.ANALOG
    } else {
      this.sig_type = SigType.SERIAL
    }
  }

  format_value(raw: string): string {
    if (this.sig_type === SigType.UNKNOWN) this.resolve_type_from_value(raw)

    if (this.sig_type === SigType.SERIAL) {
      if (!raw) return ''
      // dbgsignal returns serial values as hex-encoded bytes, e.g. "62" for "b"
      return hexToLatin1(raw)
    }

    const v = parseInt(raw, 10)
    // Non-integer on a digital/analog signal — try hex decode
    if (isNaN(v)) return hexToLatin1(raw)

    if (this.sig_type === SigType.DIGITAL) return v ? 'ON' : 'OFF'
    return String(v)
  }
}

// Only the lower byte determines signal type; upper byte encodes direction/scope
const TYPE_LOWER_ANALOG = 0x01
const TYPE_LOWER_SERIAL = 0x02

function flagsToType(flags: number, name: string): SigType {
  if (name.endsWith('$')) return SigType.SERIAL
  const lower = flags & 0xff
  if (lower === TYPE_LOWER_SERIAL) return SigType.SERIAL
  if (lower === TYPE_LOWER_ANALOG) return SigType.ANALOG
  return SigType.DIGITAL
}

const utf16 = new TextDecoder('utf-16le')

/**
 * Parse a .sig file and return a Map of signal number -> Signal.
 * Records are found by scanning; unknown/preamble bytes are skipped.
 */
export function loadSigFile(buffer: ArrayBuffer): Map<number, Signal> {
  const data = new Uint8Array(buffer)
  const view = new DataView(buffer)

  // The header is "[LOGOSSIG<version>]" with no guaranteed newline after it.
  // Find the closing ']' of the tag rather than relying on '\n', which may
  // be absent or may appear first as the low byte of a signal number.
  const closeBracket = data.indexOf(0x5d) // ']'
  if (closeBracket === -1) throw new Error('Invalid .sig file: no header closing bracket')

  const prefix = String.fromCharCode(...data.subarray(0, Math.min(closeBracket + 1, 9)))
  if (!prefix.startsWith('[LOGOSSIG')) throw new Error('Not a valid .sig file')

  // Skip an optional newline immediately after ']'
  let pos = data[closeBracket + 1] === 0x0a ? closeBracket + 2 : closeBracket + 1
  const signals = new Map<number, Signal>()

  while (pos + 8 <= data.length) {
    const recSize = view.getUint16(pos, true)

    // Minimum valid record: 8 bytes
    if (recSize < 8 || pos + recSize > data.length) { pos++; continue }

    const nameBytes = recSize - 8
    if (nameBytes % 2 !== 0) { pos++; continue }

    // Validate name — all UTF-16LE chars must be printable ASCII
    const name = utf16.decode(data.subarray(pos + 2, pos + 2 + nameBytes))
    if (![...name].every(c => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) < 0x80)) { pos++; continue }

    const nameEnd = pos + 2 + nameBytes
    const sigNum    = view.getUint16(nameEnd, true)
    const typeFlags = view.getUint16(nameEnd + 4, true)

    if (data[nameEnd + 2] !== 0 || data[nameEnd + 3] !== 0 || sigNum === 0) { pos++; continue }

    signals.set(sigNum, new Signal(sigNum, name, flagsToType(typeFlags, name), typeFlags))
    pos += recSize
  }

  return signals
}
