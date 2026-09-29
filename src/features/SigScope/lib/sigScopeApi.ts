/**
 * SigScope's connection to the processor, running in the browser.
 *
 * Replaces the VS Code webview bridge (vscodeApi.ts) and does the extension
 * host's job itself: it drives DBGSIGNAL over the Essentials console session
 * WebSocket (one loopback SSH session per socket), parses the console stream,
 * and batches signal changes for the UI. Exported names match the originals so
 * the SigScope components work unchanged.
 *
 * Console session protocol (see ConsoleSessionClient.cs):
 *   Browser to server: {"type":"connect","username","password"}, {"type":"send","data"}, {"type":"disconnect"}
 *   Server to browser: {"type":"status","state","message"}, {"type":"data","data"}
 */

import type { BookmarkGroup, ConnectionInfo, Signal as WireSignal, WsUpdate } from '../types'
import { classifyLine, LineSplitter } from './consoleParser'
import { loadSigFile, Signal } from './sigParser'

type ServerMessage =
  | { type: 'data'; data: string }
  | { type: 'status'; state: string; message: string }

// ── Listeners ────────────────────────────────────────────────────────────────

type UpdateListener = (updates: WsUpdate[]) => void
type WatchListListener = (signals: WireSignal[], bookmarkGroups: BookmarkGroup[]) => void
type DisconnectListener = (reason: string) => void
type ProgramRestartedListener = (program: number) => void
type ResumeWatchingListener = () => void
type NoticeListener = (message: string) => void

const updateListeners = new Set<UpdateListener>()
const traceListeners = new Set<UpdateListener>()
const watchListListeners = new Set<WatchListListener>()
const disconnectListeners = new Set<DisconnectListener>()
const programRestartedListeners = new Set<ProgramRestartedListener>()
const resumeWatchingListeners = new Set<ResumeWatchingListener>()
const noticeListeners = new Set<NoticeListener>()

function subscribe<T>(set: Set<T>, fn: T): () => void {
  set.add(fn)
  return () => { set.delete(fn) }
}

export const onUpdates = (fn: UpdateListener) => subscribe(updateListeners, fn)
export const onTrace = (fn: UpdateListener) => subscribe(traceListeners, fn)
/** Kept for the copied components; there is no .smw source yet, so this never fires. */
export const onWatchListUpdate = (fn: WatchListListener) => subscribe(watchListListeners, fn)
/** Unexpected disconnects only; a user-initiated apiDisconnect does not fire this. */
export const onDisconnected = (fn: DisconnectListener) => subscribe(disconnectListeners, fn)
export const onProgramRestarted = (fn: ProgramRestartedListener) => subscribe(programRestartedListeners, fn)
export const onResumeWatching = (fn: ResumeWatchingListener) => subscribe(resumeWatchingListeners, fn)
/** Non-fatal status from the session, such as dropped console output. */
export const onNotice = (fn: NoticeListener) => subscribe(noticeListeners, fn)

// ── Session state ────────────────────────────────────────────────────────────

/** The WebSocket itself failed to open, usually because the server's certificate isn't trusted yet. */
export class SocketOpenError extends Error {}

const CONNECT_TIMEOUT_MS = 20_000

// The shell reports connected before the console finishes printing its login
// banner; commands sent right away were rejected ("Bad or Incomplete Command")
const CONSOLE_SETTLE_MS = 1000

const FLUSH_INTERVAL_MS = 50
const MAX_BATCH = 300

let socket: WebSocket | null = null
let program = 1
let connected = false
let restarting = false
let sigMap = new Map<number, Signal>()
const splitter = new LineSplitter()

let updateQueue: WsUpdate[] = []
let traceQueue: WsUpdate[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function dbg(): string {
  return `DBGSIGNAL:${program}`
}

function sendRaw(cmd: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify({ type: 'send', data: `${cmd}\r\n` }))
}

/** Drops the socket and all per-connection state. Does not notify listeners. */
function teardown(): void {
  const s = socket
  socket = null
  connected = false
  restarting = false
  sigMap = new Map()
  splitter.reset()
  updateQueue = []
  traceQueue = []
  if (flushTimer !== null) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  if (s) {
    s.onopen = s.onmessage = s.onerror = s.onclose = null
    s.close()
  }
}

function dropConnection(reason: string): void {
  const wasConnected = connected
  teardown()
  if (wasConnected) disconnectListeners.forEach(l => l(reason))
}

// ── Connect / disconnect ─────────────────────────────────────────────────────

/**
 * Opens a console session and starts DBGSIGNAL on the given program slot.
 * Resolves once the SSH console is ready for commands.
 */
export function apiConnect(info: ConnectionInfo): Promise<void> {
  teardown()
  program = info.program

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const fail = (err: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      teardown()
      reject(err)
    }
    const timer = setTimeout(() => fail(new Error('Timed out opening the SSH console')), CONNECT_TIMEOUT_MS)

    const ws = new WebSocket(info.url)
    socket = ws

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.type === 'data') {
        handleData(msg.data)
        return
      }

      switch (msg.state) {
        case 'idle':
          // WebSocket is up; hand over credentials to open the loopback SSH session
          ws.send(JSON.stringify({ type: 'connect', username: info.username, password: info.password }))
          break
        case 'connected':
          if (settled) break
          setTimeout(() => {
            if (socket !== ws || settled) return
            settled = true
            clearTimeout(timer)
            connected = true
            flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
            sendRaw(`${dbg()} TIME ON`)
            resolve()
          }, CONSOLE_SETTLE_MS)
          break
        case 'disconnected':
          if (!settled) fail(new Error(msg.message))
          else dropConnection(msg.message)
          break
        case 'overflow':
          noticeListeners.forEach(l => l('Processor output dropped: the browser fell behind'))
          break
        case 'error':
          // Errors about a single command don't end a live session
          if (!settled) fail(new Error(msg.message))
          else noticeListeners.forEach(l => l(msg.message))
          break
      }
    }

    ws.onerror = () => fail(new SocketOpenError('WebSocket connection failed'))

    ws.onclose = () => {
      if (!settled) fail(new SocketOpenError('WebSocket closed before the SSH console opened'))
      else dropConnection('Console session closed')
    }
  })
}

export function apiDisconnect(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    sendRaw(`${dbg()} ALL OFF`)
    socket.send(JSON.stringify({ type: 'disconnect' }))
  }
  teardown()
}

// ── .sig loading ─────────────────────────────────────────────────────────────

export interface SigLoadResult {
  signals_loaded: number
  filename: string
  watch_signals: WireSignal[]
  bookmark_groups: BookmarkGroup[]
}

/** Loads an uploaded .sig; its signal numbers must match the program running in the slot. */
export async function apiLoadSigFile(file: File): Promise<SigLoadResult> {
  if (!file.name.toLowerCase().endsWith('.sig')) throw new Error('Choose a .sig file')
  sigMap = loadSigFile(await file.arrayBuffer())
  return { signals_loaded: sigMap.size, filename: file.name, watch_signals: [], bookmark_groups: [] }
}

export function apiGetSignals(): WireSignal[] {
  return [...sigMap.values()].map(s => ({
    num: s.num, name: s.name, display_name: s.display_name, sig_type: s.sig_type,
  }))
}

// ── DBGSIGNAL commands ───────────────────────────────────────────────────────

export function apiWatch(num: number): void {
  sendRaw(`${dbg()} ${num} ON`)
  sendRaw(`${dbg()} ${num} SYNC`)
}
export function apiUnwatch(num: number): void { sendRaw(`${dbg()} ${num} OFF`) }
export function apiWatchAll(): void { sendRaw(`${dbg()} ALL ON`) }
export function apiUnwatchAll(): void { sendRaw(`${dbg()} ALL OFF`) }
export function apiSync(num: number): void { sendRaw(`${dbg()} ${num} SYNC`) }
export function apiSyncAll(): void { sendRaw(`${dbg()} ALL SYNC`) }
export function apiSetSignal(num: number, value: string): void {
  sendRaw(`SETSIGNAL:${program} ${num} "${value}"`)
}

// ── Stream handling ──────────────────────────────────────────────────────────

function handleData(text: string): void {
  for (const line of splitter.push(text)) {
    const parsed = classifyLine(line)
    if (!parsed) continue

    switch (parsed.kind) {
      case 'signal':
        onSignalChange(parsed.num, parsed.value)
        break
      case 'programStopped':
        if (parsed.program !== program) break
        restarting = true
        sendRaw(`${dbg()} ALL OFF`)
        programRestartedListeners.forEach(l => l(program))
        break
      case 'programInitialized':
        if (parsed.program !== program || !restarting) break
        restarting = false
        sendRaw(`${dbg()} TIME ON`)
        resumeWatchingListeners.forEach(l => l())
        break
    }
  }
}

function onSignalChange(num: number, rawValue: string): void {
  const sig = sigMap.get(num)
  if (!sig) return
  const now = new Date()
  const timestamp = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0')
  const entry = { num, value: sig.format_value(rawValue), timestamp }
  updateQueue.push(entry)
  traceQueue.push(entry)
}

function flush(): void {
  if (updateQueue.length > 0) {
    // Latest value per signal is enough for the static view
    const latest = new Map<number, WsUpdate>()
    for (const item of updateQueue) latest.set(item.num, item)
    updateQueue = []
    emitBatches(updateListeners, [...latest.values()])
  }

  if (traceQueue.length > 0) {
    const entries = traceQueue
    traceQueue = []
    emitBatches(traceListeners, entries)
  }
}

function emitBatches(listeners: Set<UpdateListener>, items: WsUpdate[]): void {
  for (let i = 0; i < items.length; i += MAX_BATCH) {
    const batch = items.slice(i, i + MAX_BATCH)
    listeners.forEach(l => l(batch))
  }
}
