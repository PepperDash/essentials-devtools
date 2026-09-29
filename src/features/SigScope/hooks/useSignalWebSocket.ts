import { useEffect } from 'react'
import type { Signal, WsUpdate, BookmarkGroup } from '../types'
import { onUpdates, onTrace, onWatchListUpdate, onDisconnected } from '../lib/sigScopeApi'

type OnBatch = (updates: WsUpdate[]) => void
type OnTrace = (entries: WsUpdate[]) => void
type OnWatchListUpdate = (signals: Signal[], bookmarkGroups: BookmarkGroup[]) => void
type OnDisconnected = (reason: string) => void

export function useSignalWebSocket(
  onBatch: OnBatch,
  _enabled: boolean,
  onWatchListUpdateCb?: OnWatchListUpdate,
  onDisconnectedCb?: OnDisconnected,
  onTraceCb?: OnTrace,
) {
  useEffect(() => {
    const unsub1 = onUpdates(onBatch)
    const unsub2 = onWatchListUpdateCb ? onWatchListUpdate(onWatchListUpdateCb) : () => {}
    const unsub3 = onDisconnectedCb    ? onDisconnected(onDisconnectedCb)       : () => {}
    const unsub4 = onTraceCb           ? onTrace(onTraceCb)                    : () => {}
    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [onBatch, onWatchListUpdateCb, onDisconnectedCb, onTraceCb])
}
