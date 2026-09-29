import { useEffect, useMemo, useRef, useState } from 'react'
import type { FavoriteGroup, Signal } from '../types'
import type { StarAction } from '../context/SignalContext'
import { useDialog } from '../hooks/useDialog'

interface Props {
  /** The signals being edited — one row's signal, or the current multi-selection. */
  signals: Signal[]
  groups: FavoriteGroup[]
  onAdd: (sigs: Signal[], groupName: string) => void
  onRemove: (sigs: Signal[], groupName: string) => void
  onDelete: (groupName: string) => void
  onClose: () => void
}

/** How much of `signals` a given group holds. 'some' only happens for multi-selections. */
type Membership = 'all' | 'some' | 'none'

const GLYPH: Record<Membership, string> = { all: '☑', some: '⊟', none: '☐' }
const ARIA: Record<Membership, 'true' | 'mixed' | 'false'> = { all: 'true', some: 'mixed', none: 'false' }

/**
 * Tooltip for a row star. When the star acts on one group in a single click it
 * names that group; otherwise the star is only a union indicator, so on its own
 * it can't say *which* groups it means — this names them and points at the
 * dialog.
 */
export function favoriteStarTitle(groupNames: string[] | undefined, action: StarAction): string {
  if (action.kind === 'add') return `Add to "${action.group}"`
  if (action.kind === 'remove') return `Remove from "${action.group}"`
  if (!groupNames || groupNames.length === 0) return 'Add to a favorite group…'
  return `In ${groupNames.join(', ')} — click to edit groups`
}

/**
 * Favorite-group membership editor, opened from the row star or the bulk
 * selection bar. The star itself is only an indicator ("in at least one
 * group"); this dialog is where the union it stands for becomes visible and
 * editable — one row per group, click to toggle, applied immediately.
 */
export default function FavoriteGroupsModal({ signals, groups, onAdd, onRemove, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('')
  // Group name whose delete is armed and waiting for a confirming second click.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const dialogRef = useDialog(onClose)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedNums = useMemo(() => new Set(signals.map(s => s.num)), [signals])

  // An armed delete disarms itself, so it can never sit waiting to swallow a
  // later click on what looks like an ordinary row.
  useEffect(() => {
    if (pendingDelete === null) return
    const timer = setTimeout(() => setPendingDelete(null), 3000)
    return () => clearTimeout(timer)
  }, [pendingDelete])

  // Recomputed from props on every render, so an immediate add/remove shows up
  // as soon as the reducer round-trips — no local mirror of membership to drift.
  const rows = useMemo(() => groups.map(g => {
    const held = g.signalNums.reduce((n, num) => n + (selectedNums.has(num) ? 1 : 0), 0)
    const state: Membership = held === 0 ? 'none' : held === selectedNums.size ? 'all' : 'some'
    return { name: g.name, total: g.signalNums.length, held, state }
  }), [groups, selectedNums])

  const toggle = (name: string, state: Membership) => {
    setPendingDelete(null)
    if (state === 'all') onRemove(signals, name)
    else onAdd(signals, name)  // 'some' fills the rest of the selection in
  }

  const createGroup = () => {
    setPendingDelete(null)
    const name = newName.trim()
    if (!name) return
    onAdd(signals, name)
    setNewName('')
    inputRef.current?.focus()
  }

  const titleId = 'favorite-groups-title'
  const isBulk = signals.length > 1
  const subject = isBulk ? `${signals.length} signals` : signals[0]?.display_name ?? ''

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ss-modal fav-groups-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId}>Favorite groups</h3>
        <div className="ss-modal-signame" title={isBulk ? undefined : signals[0]?.name}>{subject}</div>

        {rows.length > 0 ? (
          <ul className="fav-groups-list">
            {rows.map(r => (
              <li key={r.name} className="fav-group-item">
                <button
                  className={`fav-group-row${r.state !== 'none' ? ' member' : ''}`}
                  role="checkbox"
                  aria-checked={ARIA[r.state]}
                  onClick={() => toggle(r.name, r.state)}
                  title={r.state === 'all' ? `Remove from "${r.name}"` : `Add to "${r.name}"`}
                >
                  <span className="fav-group-check" aria-hidden="true">{GLYPH[r.state]}</span>
                  <span className="fav-group-name">{r.name}</span>
                  <span className="fav-group-count">
                    {r.total === 0 ? 'empty' : r.state === 'some' ? `${r.held} of ${signals.length}` : `${r.total}`}
                  </span>
                </button>
                <button
                  className={`fav-group-delete${pendingDelete === r.name ? ' confirming' : ''}`}
                  onClick={() => {
                    if (pendingDelete === r.name) {
                      onDelete(r.name)
                      setPendingDelete(null)
                    } else {
                      setPendingDelete(r.name)
                    }
                  }}
                  title={pendingDelete === r.name
                    ? `Click again to delete "${r.name}" — there's no undo`
                    : `Delete group "${r.name}"${r.total > 0 ? ` and its ${r.total} signal${r.total !== 1 ? 's' : ''}` : ''}`}
                  aria-label={pendingDelete === r.name
                    ? `Confirm deleting group "${r.name}"`
                    : `Delete group "${r.name}"`}
                >
                  {pendingDelete === r.name ? 'Delete?' : '✕'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fav-groups-empty">No favorite groups yet — name one below.</div>
        )}

        <div className="fav-groups-new">
          <input
            ref={inputRef}
            aria-label="New group name"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setPendingDelete(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') createGroup() }}
            placeholder="New group…"
          />
          <button onClick={createGroup} disabled={!newName.trim()}>Add</button>
        </div>

        <div className="ss-modal-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
