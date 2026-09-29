import { useCallback, useEffect, useRef, useState } from 'react'
import useAppParams from '../../shared/hooks/useAppParams'
import { useGetConsoleSessionMutation } from '../../store/apiSlice'
import { selectCredentials } from '../../store/auth/authSelectors'
import { useAppSelector } from '../../store/hooks'
import SignalSearch from './components/SignalSearch'
import WatchPanel from './components/WatchPanel'
import { SignalProvider, useSignals } from './context/SignalContext'
import { useSignalWebSocket } from './hooks/useSignalWebSocket'
import {
  apiConnect, apiDisconnect, apiGetSignals, apiLoadSigFile,
  onNotice, onProgramRestarted, onResumeWatching, SocketOpenError,
} from './lib/sigScopeApi'
import type { BookmarkGroup, Signal } from './types'
import './SigScope.scss'

const PROGRAM_SLOTS = Array.from({ length: 10 }, (_, i) => i + 1)
const PROGRAM_STORAGE_KEY = 'sigscope.program'

const SEARCH_PANEL_MIN = 220
const SEARCH_PANEL_MAX = 800
const SEARCH_PANEL_DEFAULT = 560
const SEARCH_PANEL_STORAGE_KEY = 'sigscope.searchPanelWidth'

type ConnectionPhase = 'connecting' | null

function readStoredNumber(key: string, fallback: number) {
  try { return parseInt(localStorage.getItem(key) ?? '') || fallback } catch { return fallback }
}

function storeNumber(key: string, value: number) {
  try { localStorage.setItem(key, String(value)) } catch { /* storage unavailable */ }
}

function useSearchPanelWidth() {
  const [width, setWidth] = useState(() => readStoredNumber(SEARCH_PANEL_STORAGE_KEY, SEARCH_PANEL_DEFAULT))
  const save = useCallback((w: number) => {
    setWidth(w)
    storeNumber(SEARCH_PANEL_STORAGE_KEY, w)
  }, [])
  return [width, save] as const
}

/**
 * SigScope signal debugger, run over the Essentials console session: Essentials holds a loopback SSH
 * session to its own processor and this tab drives DBGSIGNAL through it for one SIMPL program slot.
 */
const SigScope = () => (
  <SignalProvider>
    <SigScopeView />
  </SignalProvider>
)

const SigScopeView = () => {
  const { appId } = useAppParams()
  const [startSession] = useGetConsoleSessionMutation()
  const {
    onBatch, onTrace, setSignals, resetState, mergeWatchList, watchAll, setSmwBookmarkGroups,
    watchMany, watchRows, watchingAll,
  } = useSignals()

  // The dev tools login is reused; the fields only appear if it is missing or SSH rejects it
  const loginCredentials = useAppSelector(selectCredentials)
  const [useManualCredentials, setUseManualCredentials] = useState(!loginCredentials)
  const [username, setUsername] = useState(loginCredentials?.username ?? '')
  const [password, setPassword] = useState('')
  const [program, setProgram] = useState(() => readStoredNumber(PROGRAM_STORAGE_KEY, 1))

  const [connected, setConnected] = useState(false)
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [certUrl, setCertUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('Not connected')
  const [notice, setNotice] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [signalsLoaded, setSignalsLoaded] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [panelWidth, setPanelWidth] = useSearchPanelWidth()

  // Leaving the tab closes the SSH session
  useEffect(() => () => apiDisconnect(), [])

  //* STREAM EVENTS *****************************************************/
  const onWatchListUpdate = useCallback((signals: Signal[], bookmarkGroups: BookmarkGroup[]) => {
    mergeWatchList(signals)
    setSmwBookmarkGroups(bookmarkGroups)
  }, [mergeWatchList, setSmwBookmarkGroups])

  const onDisconnected = useCallback((reason: string) => {
    resetState()
    setConnected(false)
    setRestarting(false)
    setSignalsLoaded(0)
    setNotice(null)
    setStatus(`Disconnected: ${reason}`)
  }, [resetState])

  useSignalWebSocket(onBatch, connected, onWatchListUpdate, onDisconnected, onTrace)

  useEffect(() => onNotice(setNotice), [])

  // DBGSIGNAL is turned off when the monitored program stops; once it initializes again,
  // replay whatever was being watched
  useEffect(() => onProgramRestarted(() => setRestarting(true)), [])

  useEffect(() => {
    return onResumeWatching(() => {
      setRestarting(false)
      if (watchingAll) watchAll()
      else if (watchRows.length > 0) watchMany(watchRows)
    })
  }, [watchingAll, watchRows, watchAll, watchMany])

  //* CONNECT ***********************************************************/
  const handleConnect = async () => {
    const credentials =
      !useManualCredentials && loginCredentials ? loginCredentials : { username, password }
    if (!appId || !credentials.username || !credentials.password) return

    resetState()
    setSignalsLoaded(0)
    setConnectError(null)
    setCertUrl(null)
    setNotice(null)
    setConnectionPhase('connecting')
    storeNumber(PROGRAM_STORAGE_KEY, program)

    let url: string
    try {
      url = (await startSession({ appId }).unwrap()).url
    } catch {
      setConnectionPhase(null)
      setConnectError('Essentials could not start the console session server')
      return
    }

    try {
      await apiConnect({ url, username: credentials.username, password: credentials.password, program })
    } catch (e) {
      setConnectionPhase(null)
      setConnectError(e instanceof Error ? e.message : String(e))
      if (e instanceof SocketOpenError) {
        setCertUrl(new URL(url.replace(/^wss:/, 'https:')).origin)
      } else if (credentials === loginCredentials) {
        // The dev tools login works for the web API but SSH refused it; let the user enter others
        setUseManualCredentials(true)
      }
      return
    }

    setConnectionPhase(null)
    setConnected(true)
    setStatus(`Connected · program slot ${program}`)
  }

  const handleDisconnect = () => {
    apiDisconnect()
    resetState()
    setConnected(false)
    setRestarting(false)
    setSignalsLoaded(0)
    setNotice(null)
    setStatus('Disconnected')
  }

  //* LOAD .SIG *********************************************************/
  const handleSigFile = async (file: File | undefined) => {
    if (!file) return
    setStatus('Loading .sig file…')
    try {
      const data = await apiLoadSigFile(file)
      setSignals(apiGetSignals())
      setSignalsLoaded(data.signals_loaded)
      watchAll()
      setSmwBookmarkGroups(data.bookmark_groups)
      setStatus(`Program slot ${program} · ${data.signals_loaded} signals from ${data.filename}`)
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  //* RESIZE ************************************************************/
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidth
    const onMove = (ev: MouseEvent) => {
      setPanelWidth(Math.min(SEARCH_PANEL_MAX, Math.max(SEARCH_PANEL_MIN, startWidth + ev.clientX - startX)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [panelWidth, setPanelWidth])

  if (!appId) return null

  const canConnect = !useManualCredentials ? !!loginCredentials : !!username && !!password

  //* RENDER ************************************************************/
  return (
    <div className="sigscope rounded overflow-hidden" data-theme="vscode">
      <header className="app-header">
        <span className="app-title">SIGSCOPE</span>
        <span className="status-bar" role="status" aria-live="polite">
          <span className={`status-dot ${connected ? 'ok' : 'off'}`} aria-hidden="true" />
          {status}
          {connectionPhase === 'connecting' && (
            <span className="connection-phase-indicator">Connecting…</span>
          )}
          {restarting && (
            <span className="restart-indicator">
              ⚠ Program restarted — trace paused, waiting for it to come back. If new code was loaded, load its .sig again.
            </span>
          )}
          {notice && <span className="restart-indicator restart-indicator-failed">{notice}</span>}
          {connected && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sig"
                hidden
                onChange={(e) => {
                  handleSigFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button className="upload-sig-btn" onClick={() => fileInputRef.current?.click()}>Load .sig</button>
              <button className="disconnect-btn" onClick={handleDisconnect}>Disconnect</button>
            </>
          )}
        </span>
      </header>

      {connected && signalsLoaded === 0 && (
        <div className="sig-prompt">
          <span>Load the .sig for the program running in slot {program} to see its signals.</span>
          <button onClick={() => fileInputRef.current?.click()}>Load .sig</button>
        </div>
      )}

      {!connected ? (
        <main className="center-content connect-stage">
          <div className="connect-wordmark" aria-label="SigScope">
            <span className="connect-wordmark-sig">SIG</span><span className="connect-wordmark-scope">SCOPE</span>
          </div>
          <div className="connect-panel">
            <h2>Debug a Program Slot</h2>
            <form
              className="connect-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!connectionPhase) handleConnect()
              }}
            >
              <label className="cred-source-field">
                Program Slot
                <select
                  value={program}
                  disabled={!!connectionPhase}
                  onChange={(e) => setProgram(Number(e.target.value))}
                >
                  {PROGRAM_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>

              {useManualCredentials ? (
                <>
                  <label>
                    Username
                    <input
                      value={username}
                      autoComplete="username"
                      disabled={!!connectionPhase}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      autoComplete="current-password"
                      disabled={!!connectionPhase}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  {loginCredentials && (
                    <button type="button" className="save-connection-btn" onClick={() => setUseManualCredentials(false)}>
                      Use dev tools login
                    </button>
                  )}
                </>
              ) : (
                <div className="op-hint">
                  SSH as <strong>{loginCredentials?.username}</strong>{' '}
                  <button type="button" className="save-connection-btn" onClick={() => setUseManualCredentials(true)}>
                    Use different credentials
                  </button>
                </div>
              )}

              <button type="submit" disabled={!canConnect || !!connectionPhase}>
                {connectionPhase ? 'Connecting…' : 'Connect'}
              </button>

              {connectError && <div className="error">{connectError}</div>}
              {certUrl && (
                <div className="error">
                  The console server may have an untrusted certificate.{' '}
                  <a href={certUrl} target="_blank" rel="noreferrer">Open {certUrl}</a>
                  , accept the certificate, then connect again.
                </div>
              )}
            </form>
          </div>
        </main>
      ) : (
        <main className="main-layout">
          <div className="search-panel" style={{ width: panelWidth }}>
            <SignalSearch />
            <div className="panel-resize-handle" onMouseDown={onDragStart} />
          </div>
          <WatchPanel />
        </main>
      )}
    </div>
  )
}

export default SigScope
