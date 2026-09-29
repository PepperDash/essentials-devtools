import { useState } from 'react'
import { useDialog } from '../hooks/useDialog'

interface Props {
  sigNum: number
  sigName: string
  currentValue: string
  onClose: () => void
  onSet: (value: string) => void
}

export default function SetValueModal({
  sigNum,
  sigName,
  currentValue,
  onClose,
  onSet,
}: Props) {
  const [value, setValue] = useState(currentValue)
  const dialogRef = useDialog(onClose)

  const handleSubmit = () => {
    onSet(value)
    onClose()
  }

  const titleId = `setval-title-${sigNum}`
  const descId = `setval-desc-${sigNum}`

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ss-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h3 id={titleId}>Set Signal #{sigNum}</h3>
        <div id={descId} className="ss-modal-signame">{sigName}</div>
        <input
          autoFocus
          aria-label="New value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          placeholder="New value"
        />
        <div className="ss-modal-actions">
          <button onClick={handleSubmit}>Set</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
