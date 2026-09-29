import { useEffect, useRef } from 'react'

/**
 * Wires up dialog accessibility: traps Tab focus inside the dialog,
 * closes on Escape, and restores focus to the previously focused element
 * when the dialog unmounts. Returns a ref to attach to the dialog container.
 *
 * `onClose` is held in a ref so the effect below can run exactly once per
 * mount. Every caller passes an inline arrow, so keying the effect on
 * `onClose` re-ran it on each parent render — and its cleanup restores focus
 * to whatever was focused before the dialog opened, so a re-render while
 * typing yanked the caret out of the dialog and back onto the element that
 * opened it. In the watch panel that fires on every 50ms signal flush.
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const root = ref.current
    if (!root) return

    const getFocusable = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('aria-hidden'))

    const focusables = getFocusable()
    if (focusables.length > 0 && !root.contains(document.activeElement)) {
      focusables[0].focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [])

  return ref
}
