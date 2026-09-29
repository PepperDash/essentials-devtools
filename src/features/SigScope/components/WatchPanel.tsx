import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Signal, SignalState, HistoryEntry, SigType, FavoriteGroup } from '../types'
import SetValueModal from './SetValueModal'
import HistoryModal from './HistoryModal'
import FavoriteGroupsModal, { favoriteStarTitle } from './FavoriteGroupsModal'
import { useSignals, starActionFor, ALL_FAVORITES, BOOKMARK_GROUP_PREFIX } from '../context/SignalContext'
import type { StarAction } from '../context/SignalContext'
import { onTrace } from '../lib/sigScopeApi'
import { RisingEdgeIcon, FallingEdgeIcon } from './Icons'

const MAX_SCROLL_ROWS = 10_000

// <select> can't use null as an option value, so the "off" state gets its own sentinel.
const FAVORITES_FILTER_OFF = '__off__'

// ── Resizable columns ─────────────────────────────────────────────────────────

const DEFAULT_COL_WIDTHS = { type: 60, name: 220, value: 140, updated: 110, actions: 260 }
type ColWidths = typeof DEFAULT_COL_WIDTHS

function useColWidths(): [ColWidths, (col: keyof ColWidths, w: number) => void] {
  const [widths, setWidths] = useState<ColWidths>(() => {
    try { return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(localStorage.getItem('sigscope.watchColWidths') ?? '{}') } }
    catch { return DEFAULT_COL_WIDTHS }
  })
  const set = useCallback((col: keyof ColWidths, w: number) => {
    setWidths((prev) => {
      const next = { ...prev, [col]: Math.max(40, w) }
      localStorage.setItem('sigscope.watchColWidths', JSON.stringify(next))
      return next
    })
  }, [])
  return [widths, set]
}

function ResizeHandle({ startWidth, onResize }: { startWidth: number; onResize: (w: number) => void }) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => onResize(Math.max(40, startWidth + ev.clientX - startX))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  return <span className="col-resize-handle" onMouseDown={onMouseDown} />
}

// ── Shared sub-components ─────────────────────────────────────────────────────

// Colors digital values green (ON) or grey (OFF); no-op for analog/serial
function ValueCell({ value, sig_type }: { value: string; sig_type: string }) {
  return (
    <span className={sig_type === 'digital' ? (value === 'ON' ? 'val-on' : 'val-off') : ''}>
      {value}
    </span>
  )
}

export function RowActions({
  num,
  display_name,
  value,
  sig_type,
  isFavorited,
  favoriteGroupNames,
  starAction,
  onStar,
  onSet,
  onSync,
  onHide,
  onHistory,
}: {
  num: number
  display_name: string
  value: string
  sig_type: string
  isFavorited?: boolean
  favoriteGroupNames?: string[]
  starAction?: StarAction
  onStar?: (num: number) => void
  onSet: (num: number, value: string) => void
  onSync?: (num: number) => void
  onHide?: (num: number) => void
  onHistory?: (num: number, name: string) => void
}) {
  return (
    <span className="row-actions">
      {onStar && (
        <button
          className={`favorite-star${isFavorited ? ' active' : ''}`}
          aria-label={`Favorite groups for ${display_name}`}
          title={favoriteStarTitle(favoriteGroupNames, starAction ?? { kind: 'dialog' })}
          onClick={(e) => { e.stopPropagation(); onStar(num) }}
        >
          {isFavorited ? '★' : '☆'}
        </button>
      )}
      {sig_type === 'digital' ? (
        <>
          <button
            className="act-btn act-latch-num"
            title="Latch ON (1)"
            aria-label={`Latch ${display_name} on`}
            onClick={(e) => { e.stopPropagation(); onSet(num, '1') }}
          ><RisingEdgeIcon size={18} /></button>
          <button
            className="act-btn act-latch-num"
            title="Latch OFF (0)"
            aria-label={`Latch ${display_name} off`}
            onClick={(e) => { e.stopPropagation(); onSet(num, '0') }}
          ><FallingEdgeIcon size={18} /></button>
          <button
            className="act-btn"
            title="Press: 1 while held, 0 on release"
            aria-label={`Momentary press ${display_name}`}
            onMouseDown={(e) => { e.stopPropagation(); onSet(num, '1') }}
            onMouseUp={(e) => { e.stopPropagation(); onSet(num, '0') }}
            onMouseLeave={(e) => { if (e.buttons === 1) onSet(num, '0') }}
            onTouchStart={(e) => { e.stopPropagation(); onSet(num, '1') }}
            onTouchEnd={(e) => { e.stopPropagation(); onSet(num, '0') }}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSet(num, '1') } }}
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSet(num, '0') } }}
          ><span className="act-icon-press">☞</span></button>
        </>
      ) : (
        <button className="act-btn act-icon-pencil" title="Set value" aria-label={`Set value for ${display_name}`} onClick={() => onSet(num, value)}>✎</button>
      )}
      {onSync && <button className="act-btn" title="Sync" aria-label={`Sync ${display_name}`} onClick={() => onSync(num)}>↻</button>}
      {onHistory && <button className="act-btn" title="History" aria-label={`Show history for ${display_name}`} onClick={() => onHistory(num, display_name)}><span className="act-icon-history">⏱</span></button>}
      {onHide && (
        <button className="act-btn act-remove" title="Hide signal" aria-label={`Hide ${display_name}`}
          onClick={() => onHide(num)}>✕</button>
      )}
    </span>
  )
}

// ── Row shape used in both modes ──────────────────────────────────────────────

interface TableRow {
  id: number          // num for static mode; auto-incrementing scrollIdCounter for scroll
  num: number
  display_name: string
  sig_type: string
  value: string
  timestamp: string
}

function toRegex(term: string, regex = false): { re: RegExp; err: null } | { re: null; err: string } {
  if (regex) {
    try { return { re: new RegExp(term, 'i'), err: null } }
    catch (e) { return { re: null, err: (e as Error).message } }
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { re: new RegExp(escaped, 'i'), err: null }
}

function filterRows<T extends { display_name: string; num: number }>(rows: T[], nameFilter: string, regex = false): T[] {
  if (!nameFilter) return rows
  const { re } = toRegex(nameFilter, regex)
  return re ? rows.filter((r) => re.test(r.display_name) || re.test(String(r.num))) : []
}

function matchesValueTerm(value: string, term: string): boolean {
  const f = term.trim()
  if (!f) return false
  // Range: 100..200
  const range = f.match(/^(-?[\d.]+)\.\.(-?[\d.]+)$/)
  if (range) {
    const lo = parseFloat(range[1]), hi = parseFloat(range[2])
    const v = parseFloat(value)
    return !isNaN(v) && v >= lo && v <= hi
  }
  const numOp = f.match(/^(>=|<=|>|<)(.*)$/)
  if (numOp) {
    const [, op, rhs] = numOp
    const threshold = parseFloat(rhs)
    if (isNaN(threshold)) return false
    const v = parseFloat(value)
    if (isNaN(v)) return false
    if (op === '>')  return v > threshold
    if (op === '<')  return v < threshold
    if (op === '>=') return v >= threshold
    if (op === '<=') return v <= threshold
    return false
  }
  if (f.startsWith('=')) return value.toLowerCase() === f.slice(1).toLowerCase()
  return value.toLowerCase().includes(f.toLowerCase())
}

function filterByValue(rows: TableRow[], valueFilter: string): TableRow[] {
  if (!valueFilter) return rows
  const terms = valueFilter.split(',').map((t) => t.trim()).filter(Boolean)
  return rows.filter((r) => terms.some((t) => matchesValueTerm(r.value, t)))
}

// ── Static mode ───────────────────────────────────────────────────────────────

function StaticTable({
  watchRows,
  signalState,
  historyMap,
  nameFilter,
  nameRegexMode,
  valueFilter,
  favorites,
  favoriteGroups,
  hiddenSignals,
  onHideMany,
  onUnhideMany,
  onSync,
  onSet,
  favoriteGroupNamesByNum,
  favoritesFilter,
  onSaveToFavoriteGroup,
  onRemoveFromFavoriteGroup,
  onDeleteFavoriteGroup,
  colWidths,
  onResize,
}: {
  watchRows: Signal[]
  signalState: Map<number, SignalState>
  historyMap: Map<number, HistoryEntry[]>
  nameFilter: string
  nameRegexMode: boolean
  valueFilter: string
  favorites: Set<number>
  favoriteGroups: FavoriteGroup[]
  hiddenSignals: Set<number>
  onHideMany: (nums: number[]) => void
  onUnhideMany: (nums: number[]) => void
  onSync: (num: number) => void
  onSet: (num: number, value: string) => void
  favoriteGroupNamesByNum: Map<number, string[]>
  favoritesFilter: string | null
  onSaveToFavoriteGroup: (sigs: Signal[], groupName: string) => void
  onRemoveFromFavoriteGroup: (sigs: Signal[], groupName: string) => void
  onDeleteFavoriteGroup: (groupName: string) => void
  colWidths: ColWidths
  onResize: (col: keyof ColWidths, delta: number) => void
}) {
  const [setModal, setSetModal] = useState<{ num: number; name: string; value: string } | null>(null)
  const [histModal, setHistModal] = useState<{ num: number; name: string } | null>(null)
  const [favModal, setFavModal] = useState<Signal[] | null>(null)
  const [selectedNums, setSelectedNums] = useState<Set<number>>(new Set())
  const anchorIndexRef = useRef<number | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // In the watch panel the star takes a row back out of whichever single group
  // is in view; with no single group to act on it opens the dialog instead.
  const starAction = starActionFor(favoritesFilter, 'watch')
  const handleStar = useCallback((sig: Signal) => {
    const action = starActionFor(favoritesFilter, 'watch')
    if (action.kind === 'remove') onRemoveFromFavoriteGroup([sig], action.group)
    else if (action.kind === 'add') onSaveToFavoriteGroup([sig], action.group)
    else setFavModal([sig])
  }, [favoritesFilter, onRemoveFromFavoriteGroup, onSaveToFavoriteGroup])

  const favoriteSelected = useCallback(() => {
    const sigs = watchRows.filter(s => selectedNums.has(s.num))
    if (sigs.length > 0) setFavModal(sigs)
  }, [watchRows, selectedNums])

  const selectedHidden = useMemo(() => [...selectedNums].filter(n => hiddenSignals.has(n)), [selectedNums, hiddenSignals])
  const selectedVisible = useMemo(() => [...selectedNums].filter(n => !hiddenSignals.has(n)), [selectedNums, hiddenSignals])

  const hideSelected = useCallback(() => {
    onHideMany(selectedVisible)
    setSelectedNums(new Set())
  }, [selectedVisible, onHideMany])

  const unhideSelected = useCallback(() => {
    onUnhideMany(selectedHidden)
    setSelectedNums(new Set())
  }, [selectedHidden, onUnhideMany])

  const syncSelected = useCallback(() => {
    selectedNums.forEach(num => onSync(num))
    setSelectedNums(new Set())
  }, [selectedNums, onSync])

  const rows = useMemo<TableRow[]>(() => {
    const nameFiltered = filterRows(watchRows, nameFilter, nameRegexMode)
    const mapped = nameFiltered.map((r) => {
      const st = signalState.get(r.num)
      return { id: r.num, num: r.num, display_name: r.display_name, sig_type: r.sig_type, value: st?.value ?? '', timestamp: st?.timestamp ?? '' }
    })
    return filterByValue(mapped, valueFilter)
  }, [watchRows, nameFilter, valueFilter, signalState])

  const handleRowClick = useCallback((num: number, index: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    if (e.button !== 0) return
    const isMeta = e.metaKey || e.ctrlKey
    if (e.shiftKey && anchorIndexRef.current !== null) {
      const lo = Math.min(anchorIndexRef.current, index)
      const hi = Math.max(anchorIndexRef.current, index)
      setSelectedNums(new Set(rows.slice(lo, hi + 1).map(r => r.num)))
    } else if (isMeta) {
      setSelectedNums(prev => {
        const next = new Set(prev)
        next.has(num) ? next.delete(num) : next.add(num)
        return next
      })
      anchorIndexRef.current = index
    } else {
      setSelectedNums(new Set([num]))
      anchorIndexRef.current = index
    }
  }, [rows])

  const rowVirt = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 32, overscan: 20 })

  return (
    <>
      {selectedNums.size > 0 && (
        <div className="watch-sel-bar">
          <span className="watch-sel-count">{selectedNums.size} selected</span>
          <button className="sel-action-btn" onClick={favoriteSelected}>
            ★ Favorite groups… {selectedNums.size}
          </button>
          <button className="sel-action-btn" onClick={syncSelected}>↻ Sync {selectedNums.size}</button>
          {selectedVisible.length > 0 && <button className="sel-action-btn sel-remove" onClick={hideSelected}>⊘ Hide {selectedVisible.length}</button>}
          {selectedHidden.length > 0 && <button className="sel-action-btn" onClick={unhideSelected}>⊙ Unhide {selectedHidden.length}</button>}
          <button className="sel-action-btn sel-clear" onClick={() => setSelectedNums(new Set())}>Deselect</button>
        </div>
      )}
      <div ref={parentRef} className="table-scroll">
        <table className="signal-table">
          <thead>
            <tr>
              <th className="col-type" style={{ width: colWidths.type, flex: `0 0 ${colWidths.type}px` }}>Type<ResizeHandle startWidth={colWidths.type} onResize={(w) => onResize('type', w)} /></th>
              <th className="col-name" style={{ flex: `0 0 ${colWidths.name}px` }}>Name<ResizeHandle startWidth={colWidths.name} onResize={(w) => onResize('name', w)} /></th>
              <th className="col-value" style={{ width: colWidths.value, flex: `0 0 ${colWidths.value}px` }}>Value<ResizeHandle startWidth={colWidths.value} onResize={(w) => onResize('value', w)} /></th>
              <th className="col-updated" style={{ width: colWidths.updated, flex: `0 0 ${colWidths.updated}px` }}>Updated<ResizeHandle startWidth={colWidths.updated} onResize={(w) => onResize('updated', w)} /></th>
              <th className="col-actions" style={{ width: colWidths.actions, flex: `0 0 ${colWidths.actions}px` }}></th>
            </tr>
          </thead>
          <tbody style={{ height: rowVirt.getTotalSize() }}>
            {rowVirt.getVirtualItems().map((vrow) => {
              const r = rows[vrow.index]
              const isSelected = selectedNums.has(r.num)
              return (
                <tr key={r.id} data-index={vrow.index} data-signum={r.num} ref={rowVirt.measureElement}
                  className={`vrow${isSelected ? ' row-selected' : ''}`}
                  style={{ transform: `translateY(${vrow.start}px)` }}
                  onClick={(e) => handleRowClick(r.num, vrow.index, e)}>
                  <td className="col-type" style={{ width: colWidths.type, flex: `0 0 ${colWidths.type}px` }}>
                    <span className={`ss-badge ss-badge-${r.sig_type}`}>{r.sig_type[0].toUpperCase()}</span>
                  </td>
                  <td className="cell-ellipsis col-name" style={{ flex: `0 0 ${colWidths.name}px` }} title={r.display_name}>{r.display_name}</td>
                  <td className="col-value" style={{ width: colWidths.value, flex: `0 0 ${colWidths.value}px` }}><ValueCell value={r.value} sig_type={r.sig_type} /></td>
                  <td className="col-updated" style={{ width: colWidths.updated, flex: `0 0 ${colWidths.updated}px` }}>{r.timestamp}</td>
                  <td className="col-actions" style={{ width: colWidths.actions, flex: `0 0 ${colWidths.actions}px` }}>
                    <RowActions
                      {...r}
                      isFavorited={favorites.has(r.num)}
                      favoriteGroupNames={favoriteGroupNamesByNum.get(r.num)}
                      starAction={starAction}
                      onStar={() => handleStar({ num: r.num, name: r.display_name, display_name: r.display_name, sig_type: r.sig_type as Signal['sig_type'] } as Signal)}
                      onSet={(num, val) => {
                        if (r.sig_type !== 'digital') setSetModal({ num, name: r.display_name, value: val })
                        else onSet(num, val)
                      }}
                      onSync={onSync}
                      onHistory={(num, name) => setHistModal({ num, name })}
                      onHide={(num) => onHideMany([num])}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {setModal && (
        <SetValueModal sigNum={setModal.num} sigName={setModal.name} currentValue={setModal.value}
          onClose={() => setSetModal(null)} onSet={(v) => { onSet(setModal.num, v); setSetModal(null) }} />
      )}
      {histModal && (
        <HistoryModal sigNum={histModal.num} sigName={histModal.name} history={historyMap} onClose={() => setHistModal(null)} />
      )}
      {favModal && (
        <FavoriteGroupsModal
          signals={favModal}
          groups={favoriteGroups}
          onAdd={onSaveToFavoriteGroup}
          onRemove={onRemoveFromFavoriteGroup}
          onDelete={onDeleteFavoriteGroup}
          onClose={() => setFavModal(null)}
        />
      )}
    </>
  )
}

// ── Scroll mode ───────────────────────────────────────────────────────────────

function ScrollTable({ rows, nameFilter, nameRegexMode, valueFilter, paused, colWidths, onResize, onHideMany, onUnhideMany, onSaveToFavoriteGroup, onRemoveFromFavoriteGroup, onDeleteFavoriteGroup, onSet, onSync, favorites, favoriteGroups, favoriteGroupNamesByNum, favoritesFilter, hiddenSignals, historyMap }: {
  rows: TableRow[]; nameFilter: string; nameRegexMode: boolean; valueFilter: string; paused: boolean
  colWidths: ColWidths; onResize: (col: keyof ColWidths, delta: number) => void
  onHideMany: (nums: number[]) => void
  onUnhideMany: (nums: number[]) => void
  onSaveToFavoriteGroup: (sigs: Signal[], groupName: string) => void
  onRemoveFromFavoriteGroup: (sigs: Signal[], groupName: string) => void
  onDeleteFavoriteGroup: (groupName: string) => void
  onSet: (num: number, value: string) => void
  onSync: (num: number) => void
  favoriteGroupNamesByNum: Map<number, string[]>
  favoritesFilter: string | null
  favorites: Set<number>
  favoriteGroups: FavoriteGroup[]
  hiddenSignals: Set<number>
  historyMap: Map<number, HistoryEntry[]>
}) {
  const filtered = useMemo(() => filterByValue(filterRows(rows, nameFilter, nameRegexMode), valueFilter), [rows, nameFilter, nameRegexMode, valueFilter])
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirt = useVirtualizer({ count: filtered.length, getScrollElement: () => parentRef.current, estimateSize: () => 28, overscan: 20 })

  const [setModal, setSetModal] = useState<{ num: number; name: string; value: string } | null>(null)
  const [histModal, setHistModal] = useState<{ num: number; name: string } | null>(null)
  const [favModal, setFavModal] = useState<Signal[] | null>(null)
  const [selectedNums, setSelectedNums] = useState<Set<number>>(new Set())
  const anchorIndexRef = useRef<number | null>(null)

  const handleRowClick = useCallback((num: number, index: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    if (e.button !== 0) return
    const isMeta = e.metaKey || e.ctrlKey
    if (e.shiftKey && anchorIndexRef.current !== null) {
      const lo = Math.min(anchorIndexRef.current, index)
      const hi = Math.max(anchorIndexRef.current, index)
      setSelectedNums(new Set(filtered.slice(lo, hi + 1).map(r => r.num)))
    } else if (isMeta) {
      setSelectedNums(prev => {
        const next = new Set(prev)
        next.has(num) ? next.delete(num) : next.add(num)
        return next
      })
      anchorIndexRef.current = index
    } else {
      setSelectedNums(new Set([num]))
      anchorIndexRef.current = index
    }
  }, [filtered])

  const uniqueSelectedNums = useMemo(() => [...new Set([...selectedNums])], [selectedNums])

  const selectedHidden = useMemo(() => uniqueSelectedNums.filter(n => hiddenSignals.has(n)), [uniqueSelectedNums, hiddenSignals])
  const selectedVisible = useMemo(() => uniqueSelectedNums.filter(n => !hiddenSignals.has(n)), [uniqueSelectedNums, hiddenSignals])

  const hideSelected = useCallback(() => {
    onHideMany(selectedVisible)
    setSelectedNums(new Set())
  }, [selectedVisible, onHideMany])

  const unhideSelected = useCallback(() => {
    onUnhideMany(selectedHidden)
    setSelectedNums(new Set())
  }, [selectedHidden, onUnhideMany])

  const syncSelected = useCallback(() => {
    uniqueSelectedNums.forEach(num => onSync(num))
    setSelectedNums(new Set())
  }, [uniqueSelectedNums, onSync])

  const selectedSignals = useMemo(() => {
    const seen = new Set<number>()
    const sigs: Signal[] = []
    for (const r of filtered) {
      if (selectedNums.has(r.num) && !seen.has(r.num)) {
        seen.add(r.num)
        sigs.push({ num: r.num, name: r.display_name, display_name: r.display_name, sig_type: r.sig_type as Signal['sig_type'] })
      }
    }
    return sigs
  }, [filtered, selectedNums])

  // In the watch panel the star takes a row back out of whichever single group
  // is in view; with no single group to act on it opens the dialog instead.
  const starAction = starActionFor(favoritesFilter, 'watch')
  const handleStar = useCallback((sig: Signal) => {
    const action = starActionFor(favoritesFilter, 'watch')
    if (action.kind === 'remove') onRemoveFromFavoriteGroup([sig], action.group)
    else if (action.kind === 'add') onSaveToFavoriteGroup([sig], action.group)
    else setFavModal([sig])
  }, [favoritesFilter, onRemoveFromFavoriteGroup, onSaveToFavoriteGroup])

  const favoriteSelected = useCallback(() => {
    if (selectedSignals.length > 0) setFavModal(selectedSignals)
  }, [selectedSignals])

  // Auto-scroll to bottom unless paused
  useEffect(() => {
    if (paused) return
    const el = parentRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [filtered.length, paused])

  return (
    <>
      {selectedNums.size > 0 && (
        <div className="watch-sel-bar">
          <span className="watch-sel-count">{uniqueSelectedNums.length} signal{uniqueSelectedNums.length !== 1 ? 's' : ''} selected</span>
          <button className="sel-action-btn" onClick={favoriteSelected}>
            ★ Favorite groups… {uniqueSelectedNums.length}
          </button>
          <button className="sel-action-btn" onClick={syncSelected}>↻ Sync {uniqueSelectedNums.length}</button>
          {selectedVisible.length > 0 && <button className="sel-action-btn sel-remove" onClick={hideSelected}>⊘ Hide {selectedVisible.length}</button>}
          {selectedHidden.length > 0 && <button className="sel-action-btn" onClick={unhideSelected}>⊙ Unhide {selectedHidden.length}</button>}
          <button className="sel-action-btn sel-clear" onClick={() => setSelectedNums(new Set())}>Deselect</button>
        </div>
      )}
      <div ref={parentRef} className="table-scroll">
        <table className="signal-table">
          <thead>
            <tr>
              <th className="col-num" style={{ width: colWidths.updated, flex: `0 0 ${colWidths.updated}px` }}>Time<ResizeHandle startWidth={colWidths.updated} onResize={(w) => onResize('updated', w)} /></th>
              <th className="col-type" style={{ width: colWidths.type, flex: `0 0 ${colWidths.type}px` }}>Type<ResizeHandle startWidth={colWidths.type} onResize={(w) => onResize('type', w)} /></th>
              <th className="col-name" style={{ flex: `0 0 ${colWidths.name}px` }}>Name<ResizeHandle startWidth={colWidths.name} onResize={(w) => onResize('name', w)} /></th>
              <th className="col-value" style={{ width: colWidths.value, flex: `0 0 ${colWidths.value}px` }}>Value<ResizeHandle startWidth={colWidths.value} onResize={(w) => onResize('value', w)} /></th>
              <th className="col-actions" style={{ width: colWidths.actions, flex: `0 0 ${colWidths.actions}px` }}></th>
            </tr>
          </thead>
          <tbody style={{ height: rowVirt.getTotalSize() }}>
            {rowVirt.getVirtualItems().map((vrow) => {
              const r = filtered[vrow.index]
              const isSelected = selectedNums.has(r.num)
              return (
                <tr key={r.id} data-index={vrow.index} ref={rowVirt.measureElement}
                  className={`vrow${isSelected ? ' row-selected' : ''}`}
                  style={{ transform: `translateY(${vrow.start}px)`, cursor: 'pointer' }}
                  onClick={(e) => handleRowClick(r.num, vrow.index, e)}>
                  <td className="col-num" style={{ width: colWidths.updated, flex: `0 0 ${colWidths.updated}px` }}>{r.timestamp}</td>
                  <td className="col-type" style={{ width: colWidths.type, flex: `0 0 ${colWidths.type}px` }}>
                    <span className={`ss-badge ss-badge-${r.sig_type}`}>{r.sig_type[0].toUpperCase()}</span>
                  </td>
                  <td className="cell-ellipsis col-name" style={{ flex: `0 0 ${colWidths.name}px` }} title={r.display_name}>{r.display_name}</td>
                   <td className="col-value" style={{ width: colWidths.value, flex: `0 0 ${colWidths.value}px` }}><ValueCell value={r.value} sig_type={r.sig_type} /></td>
                   <td className="col-actions" style={{ width: colWidths.actions, flex: `0 0 ${colWidths.actions}px` }}>
                     <RowActions
                      {...r}
                      isFavorited={favorites.has(r.num)}
                      favoriteGroupNames={favoriteGroupNamesByNum.get(r.num)}
                      starAction={starAction}
                      onStar={() => handleStar({ num: r.num, name: r.display_name, display_name: r.display_name, sig_type: r.sig_type as Signal['sig_type'] } as Signal)}
                      onSet={(num, val) => {
                        if (r.sig_type !== 'digital') setSetModal({ num, name: r.display_name, value: val })
                        else onSet(num, val)
                      }}
                      onSync={onSync}
                      onHistory={(num, name) => setHistModal({ num, name })}
                      onHide={(num) => onHideMany([num])}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {setModal && (
        <SetValueModal sigNum={setModal.num} sigName={setModal.name} currentValue={setModal.value}
          onClose={() => setSetModal(null)} onSet={(v) => { onSet(setModal.num, v); setSetModal(null) }} />
      )}
      {histModal && (
        <HistoryModal sigNum={histModal.num} sigName={histModal.name} history={historyMap} onClose={() => setHistModal(null)} />
      )}
      {favModal && (
        <FavoriteGroupsModal
          signals={favModal}
          groups={favoriteGroups}
          onAdd={onSaveToFavoriteGroup}
          onRemove={onRemoveFromFavoriteGroup}
          onDelete={onDeleteFavoriteGroup}
          onClose={() => setFavModal(null)}
        />
      )}
    </>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────

function buildCSV(rows: { display_name: string; value: string; timestamp: string }[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = ['name,value,timestamp', ...rows.map((r) => `${escape(r.display_name)},${escape(r.value)},${escape(r.timestamp)}`)]
  return lines.join('\n')
}

function saveCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function CsvModal({ csv, filename, onClose }: { csv: string; filename: string; onClose: () => void }) {
  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal ss-modal-wide" style={{ maxWidth: 760, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <h3>Generate CSV</h3>
        <textarea
          readOnly
          value={csv}
          style={{ flex: 1, minHeight: 300, resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, padding: 8 }}
          onFocus={e => e.target.select()}
        />
        <div className="ss-modal-actions">
          <button onClick={() => saveCSV(csv, filename)}>⬇ Save to file</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── WatchPanel ────────────────────────────────────────────────────────────────

let scrollIdCounter = 0

export default function WatchPanel() {
  const {
    watchRows, signalState, historyRef, syncSignal, setSignal,
    watchingAll, watchAll, unwatchAll, clearWatchView, watchRowsVersion, uiMode, setUiMode,
    favorites, favoriteGroups, favoriteGroupNamesByNum, smwBookmarkGroups, favoritesFilter, filteredFavoriteRows, saveToFavoriteGroup, removeFromFavoriteGroup, deleteFavoriteGroup, setFavoritesFilter,
    showInternal, setShowInternal, hideSignals, unhideSignals, showHidden, setShowHidden, hiddenSignals,
  } = useSignals()
  const [nameFilter, setNameFilter] = useState('')
  const [nameRegexMode, setNameRegexMode] = useState(false)
  const [valueFilter, setValueFilter] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['digital', 'analog', 'serial']))
  const [scrollRows, setScrollRows] = useState<TableRow[]>([])
  const [scrollPaused, setScrollPaused] = useState(false)
  const [colWidths, setColWidth] = useColWidths()
  const [csvModal, setCsvModal] = useState<{ csv: string; filename: string } | null>(null)

  const toggleType = useCallback((t: string, multi: boolean) => {
    setActiveTypes(prev => {
      if (multi) {
        const next = new Set(prev)
        next.has(t) ? next.delete(t) : next.add(t)
        return next
      } else {
        if (prev.size === 1 && prev.has(t)) return prev
        return new Set([t])
      }
    })
  }, [])

  // When a favorites filter is active, the displayed rows come from it instead
  // of the watch list. Hidden filter and type filter are applied at display
  // time (like a filter, not a delete).
  const baseRows = favoritesFilter !== null ? filteredFavoriteRows : watchRows
  const displayRows = (showHidden ? baseRows : baseRows.filter(s => !hiddenSignals.has(s.num)))
    .filter(s => activeTypes.has(s.sig_type))
  const filteredFavoriteNums = useMemo(
    () => new Set(filteredFavoriteRows.map(s => s.num)),
    [filteredFavoriteRows]
  )

  // Clear scroll history whenever the watch group is replaced
  const isFirstVersion = useRef(true)
  useEffect(() => {
    if (isFirstVersion.current) { isFirstVersion.current = false; return }
    setScrollRows([])
  }, [watchRowsVersion])

  // Scroll rows come from the full-fidelity trace feed (never deduped upstream),
  // filtered to signals currently in the watch list — same source and same
  // filtering the History modal and CSV export use, so all three always agree.
  // Collected regardless of uiMode so switching to static and back doesn't
  // drop history.
  useEffect(() => {
    return onTrace((entries) => {
      const newRows: TableRow[] = []
      for (const { num, value, timestamp } of entries) {
        const row = watchRows.find((r) => r.num === num)
        if (row) newRows.push({ id: ++scrollIdCounter, num, display_name: row.display_name, sig_type: row.sig_type, value, timestamp })
      }
      if (newRows.length === 0) return
      setScrollRows((prev) => {
        const combined = [...prev, ...newRows]
        return combined.length > MAX_SCROLL_ROWS ? combined.slice(-MAX_SCROLL_ROWS) : combined
      })
    })
  }, [watchRows])

  const handleWatchAllToggle = useCallback(() => {
    if (watchingAll) unwatchAll(); else watchAll()
  }, [watchingAll, watchAll, unwatchAll])

  const handleExport = useCallback(() => {
    if (uiMode === 'static') {
      const nameFiltered = filterRows(displayRows, nameFilter, nameRegexMode)
      const mapped = nameFiltered.map((r) => {
        const st = signalState.get(r.num)
        return { display_name: r.display_name, value: st?.value ?? '', timestamp: st?.timestamp ?? '', num: r.num, sig_type: r.sig_type, id: r.num }
      })
      setCsvModal({ csv: buildCSV(filterByValue(mapped, valueFilter)), filename: `watch-static-${Date.now()}.csv` })
    } else {
      setCsvModal({ csv: buildCSV(filterByValue(filterRows(scrollRows, nameFilter, nameRegexMode), valueFilter)), filename: `watch-scroll-${Date.now()}.csv` })
    }
  }, [uiMode, displayRows, signalState, scrollRows, nameFilter, nameRegexMode, valueFilter])

  return (
    <div className="watch-panel">
      {csvModal && <CsvModal csv={csvModal.csv} filename={csvModal.filename} onClose={() => setCsvModal(null)} />}
      <div className="sig-type-tabs watch-type-tabs">
        {(['digital', 'analog', 'serial'] as SigType[]).map(t => (
          <button key={t} data-sigtype={t} className={`sig-type-tab${activeTypes.has(t) ? ' active' : ''}`} onClick={(e) => toggleType(t, e.metaKey || e.ctrlKey)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="watch-toolbar">
        <button className={watchingAll ? 'active' : ''} onClick={handleWatchAllToggle}
          title={watchingAll ? 'Stop watching all signals' : 'Subscribe to all — signals appear as they change'}>
          {watchingAll ? '● Watch All Changes' : 'Watch All Changes'}
        </button>
        <select
          className={`favorites-filter-select${favoritesFilter !== null ? ' active' : ''}`}
          value={favoritesFilter ?? FAVORITES_FILTER_OFF}
          onChange={(e) => setFavoritesFilter(e.target.value === FAVORITES_FILTER_OFF ? null : e.target.value)}
          disabled={favoriteGroups.length === 0 && smwBookmarkGroups.length === 0}
          title="Filter (and watch) a favorites or SIMPL Bookmark group">
          <option value={FAVORITES_FILTER_OFF}>All signals</option>
          <optgroup label="Favorites">
            <option value={ALL_FAVORITES}>☆ All Favorites ({favorites.size})</option>
            {favoriteGroups.map(g => (
              <option key={g.name} value={g.name}>☆ {g.name} ({g.signalNums.length})</option>
            ))}
          </optgroup>
          {smwBookmarkGroups.length > 0 && (
            <optgroup label="SIMPL Bookmarks (read-only)">
              {smwBookmarkGroups.map(g => (
                <option key={g.name} value={`${BOOKMARK_GROUP_PREFIX}${g.name}`}>
                  {g.name} ({g.signals.length}{g.unresolved ? ' — empty' : ''})
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          className={showHidden ? 'active' : ''}
          onClick={() => setShowHidden(!showHidden)}
          disabled={hiddenSignals.size === 0}
          title={showHidden ? 'Hidden signals are currently shown — click to hide them again' : 'Temporarily show hidden signals'}>
          {showHidden ? '⊙ Showing Hidden' : '⊘ Hidden'}{hiddenSignals.size > 0 ? ` (${hiddenSignals.size})` : ''}
        </button>
        <button className={uiMode === 'static' ? 'active' : ''} onClick={() => setUiMode('static')}>Static</button>
        <button className={uiMode === 'scroll' ? 'active' : ''} onClick={() => setUiMode('scroll')}>Scroll</button>
        <button
          onClick={uiMode === 'static' ? clearWatchView : () => setScrollRows([])}
          title={uiMode === 'static' ? 'Clear the watch list view without unsubscribing' : 'Clear scroll log'}>
          Clear
        </button>
        <button
          className={scrollPaused ? 'active' : ''}
          style={{ minWidth: 82, ...(uiMode === 'static' ? { visibility: 'hidden' } : {}) }}
          onClick={() => setScrollPaused(p => !p)}
          title={scrollPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}>
          {scrollPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        {uiMode === 'scroll' && scrollRows.length >= MAX_SCROLL_ROWS && (
          <span className="scroll-cap-warning">⚠ Log capped at {MAX_SCROLL_ROWS.toLocaleString()} rows</span>
        )}
        <label className="internal-toggle" title="Show module signals (:: prefix)">
          <input type="checkbox" checked={showInternal} onChange={e => setShowInternal(e.target.checked)} />
          Show module signals
        </label>
        <div className="search-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input className={`filter-input${nameFilter && toRegex(nameFilter, nameRegexMode).err ? ' input-error' : ''}`}
            placeholder={nameRegexMode ? 'Name filter… (regex)' : 'Name filter…'} value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}
            title={nameFilter ? (toRegex(nameFilter, nameRegexMode).err ?? undefined) : undefined} />
          <button className={`regex-toggle${nameRegexMode ? ' active' : ''}`}
            title={nameRegexMode ? 'Regex mode on — click to disable' : 'Enable regex search'}
            onClick={() => setNameRegexMode(v => !v)}>.*</button>
        </div>
        <input className="filter-input"
          placeholder="Value… (=ON, >100, 100..200)"
          value={valueFilter} onChange={(e) => setValueFilter(e.target.value)}
          style={{ width: 160 }} />
        <button onClick={handleExport} title="Generate CSV from visible rows">Generate CSV</button>
        <span className="watch-count">
          {uiMode === 'scroll'
            ? `${favoritesFilter !== null ? scrollRows.filter(r => filteredFavoriteNums.has(r.num)).length : scrollRows.length} events`
            : `${displayRows.length} ${favoritesFilter !== null ? 'favorited' : 'signals'}`
          }
        </span>
      </div>

      {uiMode === 'static' ? (
        <StaticTable watchRows={displayRows} signalState={signalState} historyMap={historyRef.current}
          nameFilter={nameFilter} nameRegexMode={nameRegexMode} valueFilter={valueFilter}
          favorites={favorites} favoriteGroups={favoriteGroups} hiddenSignals={hiddenSignals}
          onHideMany={hideSignals} onUnhideMany={unhideSignals} onSync={syncSignal} onSet={setSignal}
          favoriteGroupNamesByNum={favoriteGroupNamesByNum} favoritesFilter={favoritesFilter}
          onSaveToFavoriteGroup={saveToFavoriteGroup} onRemoveFromFavoriteGroup={removeFromFavoriteGroup} onDeleteFavoriteGroup={deleteFavoriteGroup}
          colWidths={colWidths} onResize={setColWidth} />
      ) : (
        <ScrollTable rows={(() => {
          const base = favoritesFilter !== null ? scrollRows.filter(r => filteredFavoriteNums.has(r.num)) : scrollRows
          const hidden = showHidden ? base : base.filter(r => !hiddenSignals.has(r.num))
          return hidden.filter(r => activeTypes.has(r.sig_type))
        })()} nameFilter={nameFilter} nameRegexMode={nameRegexMode} valueFilter={valueFilter} paused={scrollPaused}
          colWidths={colWidths} onResize={setColWidth}
          onHideMany={hideSignals} onUnhideMany={unhideSignals} onSaveToFavoriteGroup={saveToFavoriteGroup} onRemoveFromFavoriteGroup={removeFromFavoriteGroup} onDeleteFavoriteGroup={deleteFavoriteGroup}
          onSet={setSignal} onSync={syncSignal}
          favorites={favorites} favoriteGroups={favoriteGroups} favoriteGroupNamesByNum={favoriteGroupNamesByNum}
          favoritesFilter={favoritesFilter} hiddenSignals={hiddenSignals}
          historyMap={historyRef.current} />
      )}
    </div>
  )
}
