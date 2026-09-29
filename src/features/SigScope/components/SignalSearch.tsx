import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Signal, SigType, BookmarkGroup, FavoriteGroup } from '../types'
import { useSignals, starActionFor } from '../context/SignalContext'
import { RisingEdgeIcon, FallingEdgeIcon } from './Icons'
import FavoriteGroupsModal, { favoriteStarTitle } from './FavoriteGroupsModal'

// ── Tree building ────────────────────────────────────────────────────────────

interface TreeNode {
  key:      string
  label:    string
  depth:    number
  children: Map<string, TreeNode>
  signals:  Signal[]
  _count:   number | null
  /** Render children with full signal names instead of stripping path segments. */
  flat?:    boolean
  /** Bookmark that matched nothing at all. */
  stale?:   boolean
  /** Folder is gone; contents recovered by matching signal names instead. */
  derived?: boolean
}

function makeNode(key: string, label: string, depth: number): TreeNode {
  return { key, label, depth, children: new Map(), signals: [], _count: null }
}

function countSignals(node: TreeNode): number {
  if (node._count !== null) return node._count
  let n = node.signals.length
  for (const child of node.children.values()) n += countSignals(child)
  return (node._count = n)
}

const MAX_NEST = 2  // max folder depth before signals are shown flat

function insertSignal(node: TreeNode, segments: string[], sig: Signal) {
  if (segments.length === 0) { node.signals.push(sig); return }
  const [head, ...rest] = segments
  const childKey = node.key ? `${node.key}\0${head}` : head
  if (!node.children.has(head))
    node.children.set(head, makeNode(childKey, head, node.depth + 1))
  insertSignal(node.children.get(head)!, rest, sig)
}

const CONSTANT_SIGNALS = new Set(['0', '1'])

function buildTree(signals: Signal[]): TreeNode {
  const root = makeNode('', '(root)', -1)
  for (const sig of signals) {
    const segs = sig.name.startsWith('::')
      ? ['[Modules]']
      : CONSTANT_SIGNALS.has(sig.name)
        ? ['[Constants]']
        : sig.name.split(/[._]/).filter(Boolean)
    const capped = segs.slice(0, MAX_NEST)
    insertSignal(root, capped.length ? capped : ['Other'], sig)
  }
  return root
}

// Non-ASCII by design: .sig signal names are validated as printable ASCII, so
// this key can never collide with a real folder segment.
const BOOKMARKS_KEY = '\u2605 SIMPL Bookmarks'

/**
 * Graft the .smw bookmark groups on as a pinned top-level folder.
 *
 * They live inside the same tree (rather than a separate list) so folder
 * expand/collapse and range-selection, which resolve nodes by key against the
 * tree, work on them unchanged. Groups are read-only: membership comes from
 * the .smw and refreshes whenever that file changes.
 */
function addBookmarkGroups(root: TreeNode, groups: BookmarkGroup[], allowed: Set<number>): TreeNode {
  if (groups.length === 0) return root
  const bookmarksNode = makeNode(BOOKMARKS_KEY, BOOKMARKS_KEY, 0)
  bookmarksNode.flat = true
  for (const group of groups) {
    const node = makeNode(`${BOOKMARKS_KEY}\u0000${group.name}`, group.name, 1)
    node.flat = true
    node.stale = group.unresolved
    node.derived = group.source === 'prefix'
    node.signals = group.signals.filter(sig => allowed.has(sig.num))
    bookmarksNode.children.set(group.name, node)
  }
  root.children.set(BOOKMARKS_KEY, bookmarksNode)
  return root
}

// Non-ASCII by design, and distinct from BOOKMARKS_KEY — sigscope-native
// favorite groups are a separate paradigm from SIMPL's own bookmarks.
const FAVORITES_KEY = '☆ Favorites'

/**
 * Graft the sigscope-native favorite groups on as a pinned top-level folder,
 * the same way addBookmarkGroups grafts on SIMPL's — this is what makes a
 * named favorite group's signals selectable (click/shift-click/⌘-click the
 * folder row) rather than just usable as a save-target from the picker modal.
 * Unlike bookmark groups these are editable — membership comes from
 * saveToFavoriteGroup/toggleFavorite, not the .smw.
 */
function addFavoriteGroups(root: TreeNode, groups: FavoriteGroup[], signalsByNum: Map<number, Signal>, allowed: Set<number>): TreeNode {
  if (groups.length === 0) return root
  const favoritesNode = makeNode(FAVORITES_KEY, FAVORITES_KEY, 0)
  favoritesNode.flat = true
  for (const group of groups) {
    const node = makeNode(`${FAVORITES_KEY}\u0000${group.name}`, group.name, 1)
    node.flat = true
    node.signals = group.signalNums.flatMap(num => {
      const sig = signalsByNum.get(num)
      return sig && allowed.has(num) ? [sig] : []
    })
    favoritesNode.children.set(group.name, node)
  }
  root.children.set(FAVORITES_KEY, favoritesNode)
  return root
}

// ── List item flattening ─────────────────────────────────────────────────────

type ListItem =
  | { kind: 'folder'; key: string; label: string; count: number; depth: number; stale?: boolean; derived?: boolean }
  | { kind: 'signal'; sig: Signal; depth: number; localName: string }

function flattenNode(node: TreeNode, expanded: Set<string>, out: ListItem[]) {
  const SYSTEM_FOLDERS = new Set(['[Modules]', '[Constants]'])
  const isSystem = node.depth < 0 || node.flat === true || SYSTEM_FOLDERS.has(node.label)
  const prefixSegs = isSystem ? 0 : node.depth + 1
  for (const sig of node.signals) {
    let localName: string
    if (isSystem) {
      localName = sig.display_name
    } else {
      const segs = sig.name.split(/[._]/).filter(Boolean)
      const remaining = segs.slice(prefixSegs)
      localName = remaining.length > 0 ? remaining.join('_') : sig.display_name
    }
    out.push({ kind: 'signal', sig, depth: node.depth, localName })
  }

  // Pinned top-level folders stay above everything else, in this order.
  const PINNED_KEYS = [BOOKMARKS_KEY, FAVORITES_KEY]
  const BOTTOM_FOLDERS = new Set(['[Modules]', '[Constants]', 'Other'])
  const sorted = [...node.children.values()].sort((a, b) => {
    const aPin = PINNED_KEYS.indexOf(a.key), bPin = PINNED_KEYS.indexOf(b.key)
    if (aPin !== -1 || bPin !== -1) {
      if (aPin === -1) return 1
      if (bPin === -1) return -1
      return aPin - bPin
    }
    // Bookmark groups keep their .smw slot order — don't alphabetize their children
    if (node.key === BOOKMARKS_KEY) return 0
    const aBot = BOTTOM_FOLDERS.has(a.label), bBot = BOTTOM_FOLDERS.has(b.label)
    if (aBot !== bBot) return aBot ? 1 : -1
    return a.label.localeCompare(b.label, undefined, { numeric: true })
  })
  for (const child of sorted) {
    out.push({
      kind: 'folder', key: child.key, label: child.label,
      count: countSignals(child), depth: child.depth,
      stale: child.stale, derived: child.derived,
    })
    if (expanded.has(child.key)) flattenNode(child, expanded, out)
  }
}

// ── Regex helper ─────────────────────────────────────────────────────────────

function toRegex(term: string, regex = false): { re: RegExp; err: null } | { re: null; err: string } {
  if (regex) {
    try { return { re: new RegExp(term, 'i'), err: null } }
    catch (e) { return { re: null, err: (e as Error).message } }
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { re: new RegExp(escaped, 'i'), err: null }
}

function collectSignals(node: TreeNode): Signal[] {
  const out: Signal[] = [...node.signals]
  for (const child of node.children.values()) out.push(...collectSignals(child))
  return out
}

function getNodeByKey(root: TreeNode, key: string): TreeNode | null {
  const segs = key.split('\0')
  let node: TreeNode = root
  for (const seg of segs) {
    const child = node.children.get(seg)
    if (!child) return null
    node = child
  }
  return node
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SignalSearch() {
  const { signals, setSignal, syncSignal, signalState, favorites, favoriteGroupNamesByNum, favoritesFilter, searchPanelWidth, saveToFavoriteGroup, removeFromFavoriteGroup, deleteFavoriteGroup, favoriteGroups, hideSignals, unhideSignals, hiddenSignals, smwBookmarkGroups } = useSignals()
  const [query, setQuery]               = useState('')
  const [activeTypes, setActiveTypes]   = useState<Set<SigType>>(new Set(['digital', 'analog', 'serial']))
  const [expanded, setExpanded]         = useState<Set<string>>(new Set())
  const [setInputs, setSetInputs]       = useState<Record<number, string>>({})
  const [expandedNum, setExpandedNum]   = useState<number | null>(null)
  const [selectedNums, setSelectedNums] = useState<Set<number>>(new Set())
  const [selectionRange, setSelectionRange] = useState<{ lo: number; hi: number } | null>(null)
  const [favModal, setFavModal]         = useState<Signal[] | null>(null)
  const [showHiddenOnly, setShowHiddenOnly] = useState(false)
  const [regexMode, setRegexMode] = useState(false)
  const anchorIndexRef = useRef<number | null>(null)
  const treeRef        = useRef<TreeNode>(makeNode('', '(root)', -1))
  const parentRef      = useRef<HTMLDivElement>(null)

  const clearSelection = useCallback(() => {
    setSelectedNums(new Set())
    setSelectionRange(null)
  }, [])

  const syncSelected = useCallback(() => {
    for (const n of selectedNums) syncSignal(n)
    clearSelection()
  }, [selectedNums, syncSignal, clearSelection])

  const hideSelected = useCallback(() => {
    hideSignals([...selectedNums].filter(n => !hiddenSignals.has(n)))
    clearSelection()
  }, [selectedNums, hiddenSignals, hideSignals, clearSelection])

  const unhideSelected = useCallback(() => {
    unhideSignals([...selectedNums].filter(n => hiddenSignals.has(n)))
    clearSelection()
  }, [selectedNums, hiddenSignals, unhideSignals, clearSelection])

  // The search panel's favorite controls all add to whichever single group the
  // watch panel is filtered to; anything else (all signals, the whole union, a
  // read-only bookmark group) has no single target, so they open the dialog.
  // Shared by the row star, the per-folder button and the add-all button so
  // the three can't disagree about where a click lands.
  const starAction = starActionFor(favoritesFilter, 'search')
  const favoriteMany = useCallback((sigs: Signal[]) => {
    if (sigs.length === 0) return
    const action = starActionFor(favoritesFilter, 'search')
    if (action.kind === 'add') saveToFavoriteGroup(sigs, action.group)
    else if (action.kind === 'remove') removeFromFavoriteGroup(sigs, action.group)
    else setFavModal(sigs)
  }, [favoritesFilter, saveToFavoriteGroup, removeFromFavoriteGroup])

  // Describes where favoriteMany would put things, for button tooltips.
  const favoriteTargetLabel = useCallback((count: number) => {
    const what = `${count.toLocaleString()} signal${count !== 1 ? 's' : ''}`
    return starAction.kind === 'add'
      ? `Add ${what} to "${starAction.group}"`
      : `Choose favorite groups for ${what}…`
  }, [starAction])

  const saveSelectedToFavorites = useCallback(() => {
    const sigs = signals.filter(s => selectedNums.has(s.num))
    if (sigs.length > 0) setFavModal(sigs)
  }, [signals, selectedNums])

  const toggleType = useCallback((t: SigType, multi: boolean) => {
    setActiveTypes(prev => {
      if (multi) {
        // Cmd+click: freely toggle, even the last one
        const next = new Set(prev)
        next.has(t) ? next.delete(t) : next.add(t)
        return next
      } else {
        // Regular click: radio — select only this type
        if (prev.size === 1 && prev.has(t)) return prev
        return new Set([t])
      }
    })
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const isSearching = query.length > 0
  const { re, err: queryErr } = isSearching ? toRegex(query, regexMode) : { re: null, err: null }

  const counts = useMemo(() => ({
    digital: signals.filter(s => s.sig_type === 'digital').length,
    analog:  signals.filter(s => s.sig_type === 'analog').length,
    serial:  signals.filter(s => s.sig_type === 'serial').length,
  }), [signals])

  const typedSignals = useMemo(
    () => signals.filter(s => activeTypes.has(s.sig_type as SigType)),
    [signals, activeTypes]
  )

  const tree = useMemo(() => {
    const allowed = new Set(typedSignals.map(s => s.num))
    const signalsByNum = new Map(typedSignals.map(s => [s.num, s]))
    const withBookmarks = addBookmarkGroups(buildTree(typedSignals), smwBookmarkGroups, allowed)
    return addFavoriteGroups(withBookmarks, favoriteGroups, signalsByNum, allowed)
  }, [typedSignals, smwBookmarkGroups, favoriteGroups])
  useEffect(() => { treeRef.current = tree }, [tree])

  const browseItems = useMemo<ListItem[]>(() => {
    const out: ListItem[] = []
    flattenNode(tree, expanded, out)
    return out
  }, [tree, expanded])

  const searchItems = useMemo<ListItem[]>(() => {
    if (!re) return []
    return signals
      .filter(s => activeTypes.has(s.sig_type as SigType) && (re.test(s.name) || re.test(s.display_name) || re.test(String(s.num))))
      .map(sig => ({ kind: 'signal' as const, sig, depth: 0, localName: sig.display_name }))
  }, [signals, activeTypes, re])

  const hiddenItems = useMemo<ListItem[]>(() => {
    if (!showHiddenOnly) return []
    const base = signals.filter(s => hiddenSignals.has(s.num) && activeTypes.has(s.sig_type as SigType))
    const filtered = re ? base.filter(s => re.test(s.name) || re.test(s.display_name) || re.test(String(s.num))) : base
    return filtered.map(sig => ({ kind: 'signal' as const, sig, depth: 0, localName: sig.display_name }))
  }, [signals, hiddenSignals, showHiddenOnly, activeTypes, re])

  // Auto-exit hidden filter when all hidden signals are unhidden
  useEffect(() => {
    if (showHiddenOnly && hiddenSignals.size === 0) setShowHiddenOnly(false)
  }, [hiddenSignals.size, showHiddenOnly])

  const items = showHiddenOnly ? hiddenItems : isSearching ? searchItems : browseItems

  // What "all filtered" means for the add-all button: every signal passing the
  // type tabs, the query and the hidden-only toggle. Deliberately not derived
  // from `items`, which in browse mode only lists rows inside expanded folders.
  const filteredSignals = useMemo<Signal[]>(() => {
    const source = showHiddenOnly ? hiddenItems : isSearching ? searchItems : null
    if (source === null) return typedSignals
    return source.flatMap(i => (i.kind === 'signal' ? [i.sig] : []))
  }, [showHiddenOnly, hiddenItems, isSearching, searchItems, typedSignals])

  const rowVirt = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => items[i]?.kind === 'folder' ? 28 : 36,
    overscan: 10,
  })

  function commitSet(num: number) {
    const val = setInputs[num] ?? ''
    if (val.trim()) setSignal(num, val.trim())
    setExpandedNum(null)
  }

  return (
    <>

      {signals.length > 0 && (
        <div className="sig-type-tabs">
          {(['digital', 'analog', 'serial'] as SigType[]).map(t => (
            <button key={t} data-sigtype={t} className={`sig-type-tab${activeTypes.has(t) ? ' active' : ''}`} onClick={(e) => toggleType(t, e.metaKey || e.ctrlKey)}>
              {t[0].toUpperCase() + t.slice(1)}
              <span className="tab-count">{counts[t as keyof typeof counts].toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      <div className="search-row">
        <input
          className={`search-input${queryErr ? ' input-error' : ''}`}
          placeholder={regexMode ? 'Search signals… (regex)' : 'Search signals…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          title={queryErr ?? undefined}
        />
        <button
          className={`regex-toggle${regexMode ? ' active' : ''}`}
          title={regexMode ? 'Regex mode on — click to disable' : 'Enable regex search'}
          onClick={() => setRegexMode(v => !v)}
        >.*</button>
      </div>
      {queryErr && <div className="regex-error">{queryErr}</div>}
      {signals.length === 0 && <div className="hint">No .sig file loaded — download from processor to search</div>}
      {signals.length > 0 && isSearching && !showHiddenOnly && (
        <div className="hint">{searchItems.length.toLocaleString()} of {signals.length.toLocaleString()} signals</div>
      )}
      {signals.length > 0 && showHiddenOnly && (
        <div className="hint">{hiddenItems.length.toLocaleString()} of {hiddenSignals.size.toLocaleString()} hidden</div>
      )}
      {signals.length > 0 && (
        <div className="filter-btn-row">
          <button
            className={`subscribed-filter-btn${showHiddenOnly ? ' active' : ''}`}
            onClick={() => setShowHiddenOnly(v => !v)}
            disabled={hiddenSignals.size === 0}
            title={showHiddenOnly ? 'Show all signals' : 'Show only hidden signals'}
          >
            ⊘ Hidden{hiddenSignals.size > 0 ? ` (${hiddenSignals.size})` : ''}
          </button>
          <button
            className="subscribed-filter-btn"
            onClick={() => favoriteMany(filteredSignals)}
            disabled={filteredSignals.length === 0}
            title={favoriteTargetLabel(filteredSignals.length)}
          >
            ★ Favorite all ({filteredSignals.length.toLocaleString()})
          </button>
        </div>
      )}

      {selectedNums.size > 0 && (() => {
        const hiddenCount = [...selectedNums].filter(n => hiddenSignals.has(n)).length
        const visibleCount = [...selectedNums].filter(n => !hiddenSignals.has(n)).length
        return (
          <div className="hint sel-hint">
            <span>{selectedNums.size} selected</span>
            <div className="selection-actions">
              <button className="sel-action-btn" onClick={syncSelected}>↻ Sync {selectedNums.size}</button>
              <button className="sel-action-btn" onClick={saveSelectedToFavorites}>★ Favorite groups… {selectedNums.size}</button>
              {visibleCount > 0 && (
                <button className="sel-action-btn sel-danger" onClick={hideSelected} title="Hide selected signals">⊘ Hide {visibleCount}</button>
              )}
              {hiddenCount > 0 && (
                <button className="sel-action-btn" onClick={unhideSelected} title="Unhide selected signals">⊙ Unhide {hiddenCount}</button>
              )}
              <button className="sel-action-btn sel-clear" onClick={clearSelection}>✕</button>
            </div>
          </div>
        )
      })()}

      <div ref={parentRef} className="search-results">
        <ul style={{ height: rowVirt.getTotalSize(), position: 'relative', margin: 0, padding: 0, listStyle: 'none' }}>
          {rowVirt.getVirtualItems().map((vrow) => {
            const item = items[vrow.index]
            if (!item) return null
            const indent = Math.max(0, item.depth) * 12

            if (item.kind === 'folder') {
              const isOpen = expanded.has(item.key)
              const inRange = selectionRange !== null && vrow.index >= selectionRange.lo && vrow.index <= selectionRange.hi
              return (
                <li
                  key={item.key}
                  data-index={vrow.index}
                  data-key={item.key}
                  ref={rowVirt.measureElement}
                  className={`sig-folder-row${inRange ? ' selected' : ''}`}
                  style={{ position: 'absolute', top: 0, transform: `translateY(${vrow.start}px)`, width: '100%' }}
                >
                  <button
                    className="sig-folder-btn"
                    style={{ paddingLeft: 8 + indent }}
                    onClick={(e) => {
                      const isMeta = e.metaKey || e.ctrlKey
                      if (e.shiftKey) {
                        if (anchorIndexRef.current !== null) {
                          const lo = Math.min(anchorIndexRef.current, vrow.index)
                          const hi = Math.max(anchorIndexRef.current, vrow.index)
                          const nums = new Set<number>()
                          for (let i = lo; i <= hi; i++) {
                            const it = items[i]
                            if (it?.kind === 'signal') nums.add(it.sig.num)
                            else if (it?.kind === 'folder') {
                              const n = getNodeByKey(treeRef.current, it.key)
                              if (n) collectSignals(n).forEach(s => nums.add(s.num))
                            }
                          }
                          setSelectedNums(nums)
                          setSelectionRange({ lo, hi })
                        } else {
                          const node = getNodeByKey(treeRef.current, item.key)
                          if (node) setSelectedNums(new Set(collectSignals(node).map(s => s.num)))
                          setSelectionRange({ lo: vrow.index, hi: vrow.index })
                          anchorIndexRef.current = vrow.index
                        }
                      } else if (isMeta) {
                        const node = getNodeByKey(treeRef.current, item.key)
                        const folderNums = node ? collectSignals(node).map(s => s.num) : []
                        const allSelected = folderNums.length > 0 && folderNums.every(n => selectedNums.has(n))
                        setSelectedNums(prev => {
                          const next = new Set(prev)
                          allSelected ? folderNums.forEach(n => next.delete(n)) : folderNums.forEach(n => next.add(n))
                          return next
                        })
                        setSelectionRange(null)
                        anchorIndexRef.current = vrow.index
                      } else {
                        setSelectedNums(new Set())
                        setSelectionRange(null)
                        anchorIndexRef.current = vrow.index
                        toggleGroup(item.key)
                      }
                    }}
                  >
                    <span className="sig-folder-arrow">{isOpen ? '▾' : '▸'}</span>
                    <span className="sig-folder-label">{item.label}</span>
                    {item.derived && (
                      <span className="sig-folder-derived" title="This bookmark's saved view and folder are both gone — signals matched by name instead">by name</span>
                    )}
                    {item.stale
                      ? <span className="sig-folder-stale" title="Bookmark matches nothing in the loaded program — its symbols were deleted">empty</span>
                      : <span className="sig-folder-count">{item.count.toLocaleString()}</span>}
                  </button>
                  {/* Pinned containers hold groups, not signals of their own —
                      favoriting them would be meaningless, so only real
                      folders (and the groups nested inside) get the button. */}
                  {item.key !== FAVORITES_KEY && item.key !== BOOKMARKS_KEY && item.count > 0 && (
                    <button
                      className="sig-folder-fav"
                      title={favoriteTargetLabel(item.count)}
                      aria-label={`${favoriteTargetLabel(item.count)} from ${item.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const node = getNodeByKey(treeRef.current, item.key)
                        if (node) favoriteMany(collectSignals(node))
                      }}
                    >
                      ★
                    </button>
                  )}
                </li>
              )
            }

            const { sig } = item
            const isHidden = hiddenSignals.has(sig.num)
            const curVal     = signalState.get(sig.num)?.value ?? ''
            const isExpanded = expandedNum === sig.num
            const isSelected = selectedNums.has(sig.num)
            return (
              <li
                key={sig.num}
                data-index={vrow.index}
                data-signum={sig.num}
                ref={rowVirt.measureElement}
                className={`search-result-item${isHidden ? ' sig-hidden' : ''}${isSelected ? ' selected' : ''}`}
                title={sig.name}
                style={{ position: 'absolute', top: 0, transform: `translateY(${vrow.start}px)`, width: '100%', paddingLeft: indent, cursor: 'pointer' }}
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input')) return
                    const isMeta = e.metaKey || e.ctrlKey
                    if (e.shiftKey && anchorIndexRef.current !== null) {
                      const lo = Math.min(anchorIndexRef.current, vrow.index)
                      const hi = Math.max(anchorIndexRef.current, vrow.index)
                      const nums = new Set<number>()
                      for (let i = lo; i <= hi; i++) {
                        const it = items[i]
                        if (it?.kind === 'signal') nums.add(it.sig.num)
                        else if (it?.kind === 'folder') {
                          const node = getNodeByKey(treeRef.current, it.key)
                          if (node) collectSignals(node).forEach(s => nums.add(s.num))
                        }
                      }
                      setSelectedNums(nums)
                      setSelectionRange({ lo, hi })
                    } else if (isMeta) {
                      setSelectedNums(prev => {
                        const next = new Set(prev)
                        next.has(sig.num) ? next.delete(sig.num) : next.add(sig.num)
                        return next
                      })
                      setSelectionRange(null)
                      anchorIndexRef.current = vrow.index
                    } else {
                      anchorIndexRef.current = vrow.index
                      setSelectedNums(new Set())
                      setSelectionRange(null)
                      syncSignal(sig.num)
                    }
                  }}
              >
                <span className="left-indicator" aria-hidden="true">
                  {selectedNums.size > 0
                    ? (isSelected ? '☑' : '☐')
                    : hiddenSignals.has(sig.num) ? <span className="dot-unwatched">⊘</span> : ''}
                </span>
                <div className="search-result-main">
                  <span
                    role="button" tabIndex={0}
                    className={`favorite-star${favorites.has(sig.num) ? ' active' : ''}`}
                    title={favoriteStarTitle(favoriteGroupNamesByNum.get(sig.num), starAction)}
                    onClick={(e) => { e.stopPropagation(); favoriteMany([sig]) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); favoriteMany([sig]) } }}
                  >
                    {favorites.has(sig.num) ? '★' : '☆'}
                  </span>
                  <span
                    role="button" tabIndex={0}
                    className={`hide-toggle${isHidden ? ' active' : ''}`}
                    title={isHidden ? 'Unhide signal' : 'Hide signal'}
                    onClick={(e) => { e.stopPropagation(); isHidden ? unhideSignals([sig.num]) : hideSignals([sig.num]) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); isHidden ? unhideSignals([sig.num]) : hideSignals([sig.num]) } }}
                  >
                    {isHidden ? '⊘' : '◎'}
                  </span>
                  <span className={`ss-badge ss-badge-${sig.sig_type}`}>{sig.sig_type[0].toUpperCase()}</span>
                  <span className="sig-name">{sig.display_name}</span>
                  {curVal !== '' && (
                    <span className={`sig-curval${sig.sig_type === 'digital' ? (curVal === 'ON' ? ' val-on' : ' val-off') : ''}`}>
                      {curVal}
                    </span>
                  )}
                </div>

                {sig.sig_type === 'digital' ? (
                  <span className="search-result-controls" onClick={(e) => e.stopPropagation()}>
                    <button className="act-btn act-latch-num" title="Latch ON (1)"  onClick={() => setSignal(sig.num, '1')}><RisingEdgeIcon size={18} /></button>
                    <button className="act-btn act-latch-num" title="Latch OFF (0)" onClick={() => setSignal(sig.num, '0')}><FallingEdgeIcon size={18} /></button>
                    <button
                      className="act-btn" title="Press: 1 while held, 0 on release"
                      onMouseDown={(e)  => { e.stopPropagation(); setSignal(sig.num, '1') }}
                      onMouseUp={(e)    => { e.stopPropagation(); setSignal(sig.num, '0') }}
                      onMouseLeave={(e) => { if (e.buttons === 1) setSignal(sig.num, '0') }}
                      onTouchStart={(e) => { e.stopPropagation(); setSignal(sig.num, '1') }}
                      onTouchEnd={(e)   => { e.stopPropagation(); setSignal(sig.num, '0') }}
                      onKeyDown={(e)    => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSignal(sig.num, '1') } }}
                      onKeyUp={(e)      => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSignal(sig.num, '0') } }}
                    ><span className="act-icon-press">☞</span></button>
                  </span>
                ) : (
                  <span className="search-result-controls" onClick={(e) => e.stopPropagation()}>
                    {isExpanded ? (
                      <>
                        <input
                          className="search-set-input" placeholder="value"
                          value={setInputs[sig.num] ?? ''}
                          onChange={(e) => setSetInputs(prev => ({ ...prev, [sig.num]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitSet(sig.num); if (e.key === 'Escape') setExpandedNum(null) }}
                          autoFocus
                        />
                        <button className="act-btn" onClick={() => commitSet(sig.num)} title="Send">✓</button>
                        <button className="act-btn" onClick={() => setExpandedNum(null)} title="Cancel">✕</button>
                      </>
                    ) : (
                      <button className="act-btn act-icon-pencil" title="Set value"
                        onClick={() => { setSetInputs(prev => ({ ...prev, [sig.num]: '' })); setExpandedNum(sig.num) }}>✎</button>
                    )}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {favModal && (
        <FavoriteGroupsModal
          signals={favModal}
          groups={favoriteGroups}
          onAdd={saveToFavoriteGroup}
          onRemove={removeFromFavoriteGroup}
          onDelete={deleteFavoriteGroup}
          onClose={() => setFavModal(null)}
        />
      )}
    </>
  )
}

