import { useState, useEffect } from 'react'
import type { HistoryEntry } from '../types'
import { useDialog } from '../hooks/useDialog'

interface Props {
  sigNum: number
  sigName: string
  history: Map<number, HistoryEntry[]>
  onClose: () => void
}

export default function HistoryModal({ sigNum, sigName, history, onClose }: Props) {
  const [entries, setEntries] = useState(() => history.get(sigNum) ?? [])
  const dialogRef = useDialog(onClose)

  useEffect(() => {
    const id = setInterval(() => {
      setEntries([...(history.get(sigNum) ?? [])])
    }, 500)
    return () => clearInterval(id)
  }, [history, sigNum])

  const titleId = `hist-title-${sigNum}`
  const descId = `hist-desc-${sigNum}`

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ss-modal ss-modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h3 id={titleId}>
          Signal #{sigNum} History
        </h3>
        <div id={descId} className="ss-modal-signame">{sigName}</div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((entry, i) => (
                <tr key={i}>
                  <td className="ts">{entry.ts}</td>
                  <td className="val">{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ss-modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

