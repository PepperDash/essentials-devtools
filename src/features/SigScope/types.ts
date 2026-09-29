export type SigType = 'digital' | 'analog' | 'serial' | 'unknown'

export interface Signal {
  num: number
  name: string
  display_name: string
  sig_type: SigType
}

export interface SignalState {
  value: string
  timestamp: string
}

export interface HistoryEntry {
  ts: string
  value: string
}

export interface WsUpdate {
  num: number
  value: string
  timestamp: string
}

/**
 * A SIMPL Windows bookmark from the .smw, resolved to loadable signals.
 * Read-only: membership is owned by the .smw and refreshes when it changes.
 */
export interface BookmarkGroup {
  name: string
  signals: Signal[]
  /**
   * How membership was determined: the bookmark's saved detail view, a
   * same-named program folder, or signal-name prefix as a last resort.
   */
  source: 'view' | 'folder' | 'prefix'
  /** Bookmark matched nothing at all. */
  unresolved: boolean
}

/**
 * A sigscope-native favorite group: a named, user-curated set of signals.
 * Unlike BookmarkGroup, this isn't derived from the .smw — the user builds it
 * inside sigscope. Session-only for now (not yet persisted to disk).
 */
export interface FavoriteGroup {
  name: string
  signalNums: number[]
}

/** What the SigScope tab needs to open a console session for one program slot. */
export interface ConnectionInfo {
  /** WSS URL of the Essentials console session server */
  url: string
  username: string
  password: string
  program: number
}
