import { createContext, useContext, useReducer, useRef, useCallback, useEffect, useMemo, useState } from 'react'
import type { Signal, SignalState, HistoryEntry, WsUpdate, BookmarkGroup, FavoriteGroup } from '../types'
import {
  apiWatch, apiUnwatch, apiWatchAll, apiUnwatchAll,
  apiSync, apiSetSignal,
} from '../lib/sigScopeApi'

const HISTORY_MAX = 1000

// Sentinel for "show every favorite group combined" in the favorites filter —
// non-empty and namespaced so it can never collide with a real group name.
export const ALL_FAVORITES = ' __all_favorites__'

// Prefix marking a favoritesFilter value as a SIMPL Bookmark group name rather
// than a sigscope favorite group — the two are separate paradigms with
// separate name spaces (a bookmark and a favorite could share the same name),
// and bookmark groups are read-only here (selectable/watchable, not editable).
export const BOOKMARK_GROUP_PREFIX = ' __smw_bookmark__:'

export type UiMode = 'static' | 'scroll'

/**
 * What a row star does, given the watch panel's active favorites filter.
 * 'dialog' opens the membership editor; 'add'/'remove' act on one group in a
 * single click.
 */
export type StarAction =
  | { kind: 'dialog' }
  | { kind: 'add'; group: string }
  | { kind: 'remove'; group: string }

/**
 * The star's meaning follows whatever the watch panel is filtered to, so the
 * two panels stay complementary while a single group is in view: the search
 * panel adds to that group, the watch panel takes rows back out of it.
 *
 * Viewing everything ('All signals') or the whole union ('All Favorites')
 * gives no single group to act on, so those open the dialog — and so do
 * read-only SIMPL Bookmark groups, which can't be edited from here at all.
 */
export function starActionFor(favoritesFilter: string | null, panel: 'watch' | 'search'): StarAction {
  if (favoritesFilter === null || favoritesFilter === ALL_FAVORITES) return { kind: 'dialog' }
  if (favoritesFilter.startsWith(BOOKMARK_GROUP_PREFIX)) return { kind: 'dialog' }
  return panel === 'watch'
    ? { kind: 'remove', group: favoritesFilter }
    : { kind: 'add', group: favoritesFilter }
}

// ── State & Actions ───────────────────────────────────────────────────────────
// useReducer keeps all signal state in one place and guarantees a single React
// render per WebSocket batch — no matter how many signals fire at once.

interface State {
  signals: Signal[]           // full list from .sig file
  signalState: Map<number, SignalState>  // current value + timestamp per signal
  watchRows: Signal[]         // signals shown in the watch panel
  watchRowsVersion: number    // increments on SET_WATCH_ROWS so WatchPanel can clear scroll
  watchingAll: boolean        // true while DBGSIGNAL ALL ON is active
  uiMode: UiMode
  favoriteGroups: FavoriteGroup[]  // sigscope-native, user-curated named groups (session-only)
  favoritesFilter: string | null  // null = off, ALL_FAVORITES = every favorite group, BOOKMARK_GROUP_PREFIX+name = one read-only SIMPL Bookmark group, else a favorite group name
  watchAllExcluded: Set<number>  // signals excluded from watchAll auto-add (manually removed while watchingAll)
  hiddenSignals: Set<number>  // signals hidden by user (session-only, cleared on reset)
  smwBookmarkGroups: BookmarkGroup[]  // read-only groups from the .smw bookmark list — SIMPL-native, separate paradigm
}

type Action =
  | { type: 'SET_SIGNALS'; signals: Signal[] }
  | { type: 'SET_UI_MODE'; mode: UiMode }
  | { type: 'BATCH_UPDATE'; updates: WsUpdate[]; sigMap: Map<number, Signal> }
  | { type: 'WATCH_ONE'; sig: Signal }           // add to watchRows
  | { type: 'UNWATCH_ONE'; num: number }
  | { type: 'UNWATCH_MANY'; nums: Set<number> }
  | { type: 'SET_WATCH_ROWS'; rows: Signal[] }   // .smw load — updates rows only, not subscriptions
  | { type: 'WATCH_ALL' }
  | { type: 'UNWATCH_ALL' }
  | { type: 'RESET' }
  | { type: 'SAVE_TO_FAVORITE_GROUP'; nums: number[]; groupName: string }
  | { type: 'REMOVE_FROM_FAVORITE_GROUP'; nums: number[]; groupName: string }
  | { type: 'DELETE_FAVORITE_GROUP'; groupName: string }
  | { type: 'SET_FAVORITES_FILTER'; filter: string | null }
  | { type: 'SET_SMW_BOOKMARK_GROUPS'; groups: BookmarkGroup[] }
  | { type: 'HIDE_SIGNALS'; nums: number[] }
  | { type: 'UNHIDE_SIGNALS'; nums: number[] }

function getStoredJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}

function initialState(): State {
  return {
    signals: [],
    signalState: new Map(),
    watchRows: [],
    watchRowsVersion: 0,
    watchingAll: false,
    uiMode: getStoredJSON<UiMode>('sigscope.uiMode', 'static'),
    favoriteGroups: [],
    favoritesFilter: null,
    watchAllExcluded: new Set(),
    hiddenSignals: new Set(),
    smwBookmarkGroups: [],
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SIGNALS':
      return { ...state, signals: action.signals }

    case 'SET_UI_MODE':
      return { ...state, uiMode: action.mode }

    case 'BATCH_UPDATE': {
      const next = new Map(state.signalState)
      for (const { num, value, timestamp } of action.updates)
        next.set(num, { value, timestamp })

      // In watchAll mode, add newly-seen signals to the watch list as they arrive
      if (state.watchingAll) {
        const watched = new Set(state.watchRows.map((r) => r.num))
        const toAdd = action.updates
          .map((u) => action.sigMap.get(u.num))
          .filter((s): s is Signal => s !== undefined && !watched.has(s.num) && !state.watchAllExcluded.has(s.num))
        if (toAdd.length > 0)
          return { ...state, signalState: next, watchRows: [...state.watchRows, ...toAdd] }
      }
      return { ...state, signalState: next }
    }

    case 'WATCH_ONE': {
      const already = state.watchRows.some((r) => r.num === action.sig.num)
      if (already) return state
      return {
        ...state,
        watchRows: [...state.watchRows, action.sig],
        watchAllExcluded: state.watchAllExcluded.has(action.sig.num)
          ? new Set([...state.watchAllExcluded].filter(n => n !== action.sig.num))
          : state.watchAllExcluded,
      }
    }

    case 'UNWATCH_ONE':
      return {
        ...state,
        watchRows: state.watchRows.filter((r) => r.num !== action.num),
        watchAllExcluded: state.watchingAll
          ? new Set([...state.watchAllExcluded, action.num])
          : state.watchAllExcluded,
      }

    case 'UNWATCH_MANY':
      return {
        ...state,
        watchRows: state.watchRows.filter((r) => !action.nums.has(r.num)),
        watchAllExcluded: state.watchingAll
          ? new Set([...state.watchAllExcluded, ...action.nums])
          : state.watchAllExcluded,
      }

    case 'SET_WATCH_ROWS':
      // .smw-sourced update: changes the display list but does NOT change subscriptions
      return { ...state, watchRows: action.rows, watchRowsVersion: state.watchRowsVersion + 1 }

    case 'WATCH_ALL':
      return { ...state, watchingAll: true, favoritesFilter: null, watchAllExcluded: new Set() }

    case 'UNWATCH_ALL':
      return { ...state, watchingAll: false, watchRows: [], signalState: new Map(), watchAllExcluded: new Set() }

    case 'SAVE_TO_FAVORITE_GROUP': {
      const idx = state.favoriteGroups.findIndex(g => g.name === action.groupName)
      if (idx === -1) {
        return { ...state, favoriteGroups: [...state.favoriteGroups, { name: action.groupName, signalNums: [...action.nums] }] }
      }
      const group = state.favoriteGroups[idx]
      const existing = new Set(group.signalNums)
      const merged = [...group.signalNums, ...action.nums.filter(n => !existing.has(n))]
      const nextGroups = state.favoriteGroups.map((g, i) => (i === idx ? { ...g, signalNums: merged } : g))
      return { ...state, favoriteGroups: nextGroups }
    }

    case 'REMOVE_FROM_FAVORITE_GROUP': {
      // An emptied group is kept: the user named it deliberately, so it stays
      // until they delete it explicitly. Emptying it out is not a delete.
      const toRemove = new Set(action.nums)
      const nextGroups = state.favoriteGroups.map(g => (g.name === action.groupName
        ? { ...g, signalNums: g.signalNums.filter(n => !toRemove.has(n)) }
        : g))
      return { ...state, favoriteGroups: nextGroups }
    }

    case 'DELETE_FAVORITE_GROUP': {
      const nextGroups = state.favoriteGroups.filter(g => g.name !== action.groupName)
      // The watch panel can be filtered to the group being deleted — that would
      // leave the filter naming something gone, an empty panel with no way
      // back — so fall back to showing everything.
      const clearFilter = state.favoritesFilter === action.groupName
      return {
        ...state,
        favoriteGroups: nextGroups,
        favoritesFilter: clearFilter ? null : state.favoritesFilter,
      }
    }

    case 'SET_FAVORITES_FILTER':
      return { ...state, favoritesFilter: action.filter }

    case 'SET_SMW_BOOKMARK_GROUPS':
      return { ...state, smwBookmarkGroups: action.groups }

    case 'HIDE_SIGNALS': {
      const next = new Set(state.hiddenSignals)
      for (const n of action.nums) next.add(n)
      return { ...state, hiddenSignals: next }
    }

    case 'UNHIDE_SIGNALS': {
      const next = new Set(state.hiddenSignals)
      for (const n of action.nums) next.delete(n)
      return { ...state, hiddenSignals: next }
    }

    case 'RESET':
      return { ...initialState(), signals: [], uiMode: state.uiMode }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface SignalContextValue {
  signals: Signal[]
  signalState: Map<number, SignalState>
  watchRows: Signal[]
  watchRowsVersion: number
  watchedNums: Set<number>
  historyRef: React.MutableRefObject<Map<number, HistoryEntry[]>>
  uiMode: UiMode
  watchingAll: boolean
  favoriteGroups: FavoriteGroup[]  // sigscope-native named groups
  favorites: Set<number>          // union of all favorite groups' signal nums
  favoriteGroupNamesByNum: Map<number, string[]>  // signal num -> names of every group holding it
  favoritesFilter: string | null  // null = off, ALL_FAVORITES = every favorite group, BOOKMARK_GROUP_PREFIX+name = one read-only SIMPL Bookmark group, else a favorite group name
  filteredFavoriteRows: Signal[]  // signals matching favoritesFilter (display source when filter is active)
  smwBookmarkGroups: BookmarkGroup[]  // read-only .smw bookmark groups — SIMPL-native, separate paradigm
  setSmwBookmarkGroups: (groups: BookmarkGroup[]) => void
  showInternal: boolean
  setShowInternal: (v: boolean) => void
  searchPanelWidth: number
  setUiMode: (m: UiMode) => void
  onBatch: (updates: WsUpdate[]) => void
  onTrace: (entries: WsUpdate[]) => void
  watch: (sig: Signal) => void
  watchMany: (sigs: Signal[]) => void
  watchManyOnly: (sigs: Signal[]) => void
  unwatch: (num: number) => void
  unwatchMany: (nums: number[]) => void
  watchAll: () => void
  unwatchAll: () => void
  clearWatchView: () => void
  replaceWatchList: (sigs: Signal[]) => Promise<void>
  mergeWatchList: (sigs: Signal[]) => void
  setSignal: (num: number, value: string) => void
  syncSignal: (num: number) => void
  setSignals: (sigs: Signal[]) => void
  resetState: () => void
  saveToFavoriteGroup: (sigs: Signal[], groupName: string) => void
  removeFromFavoriteGroup: (sigs: Signal[], groupName: string) => void
  deleteFavoriteGroup: (groupName: string) => void
  setFavoritesFilter: (filter: string | null) => void
  hideSignals: (nums: number[]) => void
  unhideSignals: (nums: number[]) => void
  showHidden: boolean
  setShowHidden: (v: boolean) => void
  hiddenSignals: Set<number>
}

export const SignalContext = createContext<SignalContextValue | null>(null)

export function useSignals() {
  const ctx = useContext(SignalContext)
  if (!ctx) throw new Error('useSignals must be used within SignalProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SignalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [showInternal, setShowInternal] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  // History is stored in a ref (not state) because it doesn't drive rendering —
  // the HistoryModal fetches it on open rather than subscribing to updates.
  const historyRef = useRef<Map<number, HistoryEntry[]>>(new Map())

  // sigMapRef gives onBatch O(1) signal lookup without needing state.signals
  // as a dependency (which would recreate onBatch every time signals load).
  const sigMapRef = useRef<Map<number, Signal>>(new Map())
  useEffect(() => {
    sigMapRef.current = new Map(state.signals.map((s) => [s.num, s]))
  }, [state.signals])

  // Cancellation token for in-progress watch batch loops (watchMany / replaceWatchList).
  // Aborting this controller cancels all pending subscribe/sync fetches from the current batch.
  const watchAbortRef = useRef<AbortController | null>(null)

  // Persist uiMode to localStorage
  useEffect(() => {
    try { localStorage.setItem('sigscope.uiMode', JSON.stringify(state.uiMode)) } catch {}
  }, [state.uiMode])

  const setUiMode = useCallback((mode: UiMode) => dispatch({ type: 'SET_UI_MODE', mode }), [])

  // Drives only the live "current value" display — deduped to latest-per-signal
  // upstream, which is correct for a snapshot view.
  const onBatch = useCallback((updates: WsUpdate[]) => {
    dispatch({ type: 'BATCH_UPDATE', updates, sigMap: sigMapRef.current })
  }, [])

  // Full-fidelity change log (never deduped upstream) — the only thing that
  // should ever populate per-signal history, so it can never drop a transition
  // the way the live-value feed above intentionally does.
  const onTrace = useCallback((entries: WsUpdate[]) => {
    for (const { num, value, timestamp } of entries) {
      const hist = historyRef.current.get(num) ?? []
      const next = [...hist, { ts: timestamp, value }]
      historyRef.current.set(num, next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next)
    }
  }, [])

  const watch = useCallback((sig: Signal) => {
    dispatch({ type: 'WATCH_ONE', sig })
    apiWatch(sig.num)
    apiSync(sig.num)
  }, [])

  const watchManyOnly = useCallback((sigs: Signal[]) => {
    if (sigs.length === 0) return
    watchAbortRef.current?.abort()
    const ctrl = new AbortController()
    watchAbortRef.current = ctrl
    sigs.forEach(sig => {
      dispatch({ type: 'WATCH_ONE', sig })
      if (!ctrl.signal.aborted) apiWatch(sig.num)
    })
  }, [])

  const watchMany = useCallback((sigs: Signal[]) => {
    if (sigs.length === 0) return
    watchAbortRef.current?.abort()
    const ctrl = new AbortController()
    watchAbortRef.current = ctrl
    sigs.forEach(sig => {
      dispatch({ type: 'WATCH_ONE', sig })
      if (!ctrl.signal.aborted) { apiWatch(sig.num); apiSync(sig.num) }
    })
  }, [])

  const unwatch = useCallback((num: number) => {
    dispatch({ type: 'UNWATCH_ONE', num })
    historyRef.current.delete(num)
    apiUnwatch(num)
  }, [])

  const unwatchMany = useCallback((nums: number[]) => {
    const numsSet = new Set(nums)
    dispatch({ type: 'UNWATCH_MANY', nums: numsSet })
    for (const num of nums) {
      historyRef.current.delete(num)
      apiUnwatch(num)
    }
  }, [])

  const watchAll = useCallback(() => {
    dispatch({ type: 'WATCH_ALL' })
    historyRef.current.clear()
    apiWatchAll()
  }, [])

  const unwatchAll = useCallback(() => {
    watchAbortRef.current?.abort()
    watchAbortRef.current = null
    dispatch({ type: 'UNWATCH_ALL' })
    historyRef.current.clear()
    apiUnwatchAll()
  }, [])

  const clearWatchView = useCallback(() => {
    dispatch({ type: 'SET_WATCH_ROWS', rows: [] })
  }, [])

  const replaceWatchList = useCallback(async (sigs: Signal[]) => {
    watchAbortRef.current?.abort()
    const ctrl = new AbortController()
    watchAbortRef.current = ctrl
    dispatch({ type: 'SET_WATCH_ROWS', rows: sigs })
    if (ctrl.signal.aborted) return
    sigs.forEach(sig => {
      if (!ctrl.signal.aborted) apiSync(sig.num)
    })
  }, [])

  const mergeWatchList = useCallback((sigs: Signal[]) => {
    sigs.forEach(sig => {
      dispatch({ type: 'WATCH_ONE', sig })
      apiWatch(sig.num)
      apiSync(sig.num)
    })
  }, [])

  const setSignal = useCallback((num: number, value: string) => {
    const pct = value.trim().match(/^(\d+(?:\.\d+)?)\s*%$/)
    let sendValue = value
    if (pct && sigMapRef.current.get(num)?.sig_type === 'analog') {
      sendValue = String(Math.round(parseFloat(pct[1]) / 100 * 65535))
    }
    apiSetSignal(num, sendValue)
  }, [])

  const syncSignal = useCallback((num: number) => {
    apiSync(num)
  }, [])

  const setSignals = useCallback((signals: Signal[]) => {
    dispatch({ type: 'SET_SIGNALS', signals })
  }, [])

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET' })
    historyRef.current = new Map()
    try { localStorage.removeItem('sigscope.watchRows') } catch {}
  }, [])

  const watchedNums = new Set(state.watchRows.map((r) => r.num))

  const isInternal = (s: Signal) => s.name.startsWith('::')
  const visibleSignals = useMemo(
    () => showInternal ? state.signals : state.signals.filter(s => !isInternal(s)),
    [state.signals, showInternal]
  )

  const searchPanelWidth = useMemo(() => {
    // Only measure non-internal signals (:: signals are hidden by default and have long paths)
    const measurable = state.signals.filter(s => !s.name.startsWith('::'))
    if (measurable.length === 0) return 480
    const candidates = [...measurable]
      .sort((a, b) => b.display_name.length - a.display_name.length)
      .slice(0, 20)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 480
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    const maxNamePx = Math.max(...candidates.map(s => ctx.measureText(s.display_name).width))
    const overhead = 180 // star + badge + gaps + controls + padding
    return Math.min(Math.max(340, Math.ceil(maxNamePx) + overhead), 700)
  }, [state.signals])
  const visibleWatchRows = useMemo(
    () => showInternal ? state.watchRows : state.watchRows.filter(s => !isInternal(s)),
    [state.watchRows, showInternal]
  )

  // Union of every favorite group's signal nums, for O(1) "is this favorited
  // (in any group)" checks — drives the star indicator and Favorites Only.
  const favorites = useMemo(() => {
    const out = new Set<number>()
    for (const g of state.favoriteGroups) for (const n of g.signalNums) out.add(n)
    return out
  }, [state.favoriteGroups])

  // Reverse index: which groups hold each signal. The star is a union indicator,
  // so this is what lets it name the groups it's standing for (tooltip) without
  // rescanning every group per row.
  const favoriteGroupNamesByNum = useMemo(() => {
    const out = new Map<number, string[]>()
    for (const g of state.favoriteGroups) {
      for (const n of g.signalNums) {
        const names = out.get(n)
        if (names) names.push(g.name)
        else out.set(n, [g.name])
      }
    }
    return out
  }, [state.favoriteGroups])

  // Signals matching the active favorites filter — the all-favorites union, one
  // named favorite group, or (read-only) one SIMPL Bookmark group — in stable
  // signal-num order. The display source whenever a filter is selected.
  const filteredFavoriteRows = useMemo(() => {
    const filter = state.favoritesFilter
    if (filter === null) return []
    if (filter.startsWith(BOOKMARK_GROUP_PREFIX)) {
      const name = filter.slice(BOOKMARK_GROUP_PREFIX.length)
      const matchNums = new Set(state.smwBookmarkGroups.find(g => g.name === name)?.signals.map(s => s.num) ?? [])
      const out: Signal[] = []
      for (const sig of visibleSignals) if (matchNums.has(sig.num)) out.push(sig)
      return out
    }
    const matchNums = filter === ALL_FAVORITES
      ? favorites
      : new Set(state.favoriteGroups.find(g => g.name === filter)?.signalNums ?? [])
    const out: Signal[] = []
    for (const sig of visibleSignals) if (matchNums.has(sig.num)) out.push(sig)
    return out
  }, [visibleSignals, favorites, state.favoriteGroups, state.smwBookmarkGroups, state.favoritesFilter])

  // Keep live subscriptions aligned with whatever the favorites filter is
  // currently displaying. Centralized here (rather than inside each of
  // saveToFavoriteGroup/removeFromFavoriteGroup) so it also
  // reconciles correctly when the filter itself changes — e.g. picking a
  // different group in the dropdown unsubscribes the old group's exclusive
  // members and subscribes the new group's.
  const prevFilteredNumsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (state.favoritesFilter === null) {
      prevFilteredNumsRef.current = new Set()
      return
    }
    const nextSet = new Set(filteredFavoriteRows.map(s => s.num))
    const prevSet = prevFilteredNumsRef.current
    for (const sig of filteredFavoriteRows) {
      if (!prevSet.has(sig.num)) {
        dispatch({ type: 'WATCH_ONE', sig })
        apiWatch(sig.num)
        apiSync(sig.num)
      }
    }
    for (const num of prevSet) {
      if (!nextSet.has(num)) {
        dispatch({ type: 'UNWATCH_ONE', num })
        apiUnwatch(num)
      }
    }
    prevFilteredNumsRef.current = nextSet
  }, [filteredFavoriteRows, state.favoritesFilter])

  // Save signals into a named favorite group, creating the group if it's new
  // (never removes existing membership).
  const saveToFavoriteGroup = useCallback((sigs: Signal[], groupName: string) => {
    if (sigs.length === 0 || !groupName.trim()) return
    dispatch({ type: 'SAVE_TO_FAVORITE_GROUP', nums: sigs.map(s => s.num), groupName: groupName.trim() })
  }, [])

  // Remove signals from one specific group, leaving their other memberships
  // intact — the group-row toggle's off direction.
  const removeFromFavoriteGroup = useCallback((sigs: Signal[], groupName: string) => {
    if (sigs.length === 0 || !groupName.trim()) return
    dispatch({ type: 'REMOVE_FROM_FAVORITE_GROUP', nums: sigs.map(s => s.num), groupName: groupName.trim() })
  }, [])

  // Delete a whole group, members and all. The only thing that removes a group.
  const deleteFavoriteGroup = useCallback((groupName: string) => {
    if (!groupName.trim()) return
    dispatch({ type: 'DELETE_FAVORITE_GROUP', groupName })
  }, [])

  const setFavoritesFilter = useCallback((filter: string | null) => {
    dispatch({ type: 'SET_FAVORITES_FILTER', filter })
  }, [])

  const hideSignals = useCallback((nums: number[]) => {
    dispatch({ type: 'HIDE_SIGNALS', nums })
  }, [])

  const unhideSignals = useCallback((nums: number[]) => {
    dispatch({ type: 'UNHIDE_SIGNALS', nums })
  }, [])

  const setSmwBookmarkGroups = useCallback((groups: BookmarkGroup[]) => {
    dispatch({ type: 'SET_SMW_BOOKMARK_GROUPS', groups })
  }, [])

  return (
    <SignalContext.Provider value={{
      signals: visibleSignals,
      signalState: state.signalState,
      watchRows: visibleWatchRows,
      watchRowsVersion: state.watchRowsVersion,
      watchedNums,
      historyRef,
      uiMode: state.uiMode,
      watchingAll: state.watchingAll,
      favoriteGroups: state.favoriteGroups,
      favorites,
      favoriteGroupNamesByNum,
      favoritesFilter: state.favoritesFilter,
      filteredFavoriteRows,
      smwBookmarkGroups: state.smwBookmarkGroups,
      setSmwBookmarkGroups,
      showInternal,
      setShowInternal,
      searchPanelWidth,
      setUiMode,
      onBatch,
      onTrace,
      watch,
      watchMany,
      watchManyOnly,
      unwatch,
      unwatchMany,
      watchAll,
      unwatchAll,
      clearWatchView,
      replaceWatchList,
      mergeWatchList,
      setSignal,
      syncSignal,
      setSignals,
      resetState,
      saveToFavoriteGroup,
      removeFromFavoriteGroup,
      deleteFavoriteGroup,
      setFavoritesFilter,
      hideSignals,
      unhideSignals,
      showHidden,
      setShowHidden,
      hiddenSignals: state.hiddenSignals,
    }}>
      {children}
    </SignalContext.Provider>
  )
}
