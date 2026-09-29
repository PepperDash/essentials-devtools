import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Form, InputGroup } from "react-bootstrap";
import useAppParams from "../../shared/hooks/useAppParams";
import { selectCredentials } from "../../store/auth/authSelectors";
import { useAppSelector } from "../../store/hooks";
import {
  useGetConsoleSessionMutation,
  useStopConsoleSessionMutation,
} from "../../store/apiSlice";

/** Keep the rendered console bounded so long sessions don't bog down the page */
const MAX_OUTPUT_CHARS = 500_000;

type SessionState =
  | "disconnected"
  | "starting"
  | "idle"
  | "connecting"
  | "connected"
  | "error";

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "status"; state: string; message: string };

interface SessionStats {
  connectedAt: number | null;
  bytesReceived: number;
  framesReceived: number;
  commandsSent: number;
  drops: number;
  overflows: number;
}

const emptyStats: SessionStats = {
  connectedAt: null,
  bytesReceived: 0,
  framesReceived: 0,
  commandsSent: 0,
  drops: 0,
  overflows: 0,
};

const stateVariant: Record<SessionState, string> = {
  disconnected: "secondary",
  starting: "warning",
  idle: "warning",
  connecting: "warning",
  connected: "success",
  error: "danger",
};

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;?]*[A-Za-z]/g;

function normalize(text: string) {
  return text.replace(ANSI_ESCAPE, "").replace(/\r\n/g, "\n").replace(/\r/g, "");
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
}

const SshConsole = () => {
  const { appId } = useAppParams();
  const [startSession] = useGetConsoleSessionMutation();
  const [stopSession] = useStopConsoleSessionMutation();

  // The dev tools login is reused; the fields only appear if it is missing or SSH rejects it
  const loginCredentials = useAppSelector(selectCredentials);
  const [useManualCredentials, setUseManualCredentials] = useState(!loginCredentials);
  const [username, setUsername] = useState(loginCredentials?.username ?? "");
  const [password, setPassword] = useState("");
  const [state, setStateValue] = useState<SessionState>("disconnected");
  const stateRef = useRef<SessionState>("disconnected");
  const [statusMessage, setStatusMessage] = useState("");
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<SessionStats>(emptyStats);
  const [now, setNow] = useState(Date.now());
  const [autoScroll, setAutoScroll] = useState(true);

  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [burstCommand, setBurstCommand] = useState("ver");
  const [burstCount, setBurstCount] = useState(100);
  const [burstIntervalMs, setBurstIntervalMs] = useState(10);
  const [bursting, setBursting] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const credentialsRef = useRef({ username: "", password: "" });
  const usingLoginCredentialsRef = useRef(false);
  const pendingRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const burstCancelRef = useRef(false);

  const setState = useCallback((next: SessionState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  // An unexpected close while connected counts as a drop; a user-initiated disconnect does not
  const markClosed = useCallback(
    (next: SessionState) => {
      if (stateRef.current === "connected") {
        setStats((s) => ({ ...s, drops: s.drops + 1, connectedAt: null }));
      }
      setState(next);
    },
    [setState],
  );

  //* OUTPUT ************************************************************/
  // Incoming chunks are batched into one state update per animation frame
  const appendOutput = useCallback((text: string) => {
    pendingRef.current += text;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const chunk = pendingRef.current;
      pendingRef.current = "";
      setOutput((prev) => {
        const next = prev + chunk;
        return next.length > MAX_OUTPUT_CHARS
          ? next.slice(next.length - MAX_OUTPUT_CHARS)
          : next;
      });
    });
  }, []);

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  useEffect(() => {
    if (state !== "connected") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state]);

  //* SOCKET ************************************************************/
  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === "data") {
        setStats((s) => ({
          ...s,
          bytesReceived: s.bytesReceived + message.data.length,
          framesReceived: s.framesReceived + 1,
        }));
        appendOutput(normalize(message.data));
        return;
      }

      setStatusMessage(message.message);

      switch (message.state) {
        case "idle":
          // WebSocket is up; hand over credentials to open the loopback SSH session
          setState("connecting");
          socketRef.current?.send(
            JSON.stringify({ type: "connect", ...credentialsRef.current }),
          );
          break;
        case "connecting":
          setState("connecting");
          break;
        case "connected":
          setState("connected");
          setStats((s) => ({ ...s, connectedAt: Date.now() }));
          break;
        case "disconnected":
          markClosed("disconnected");
          break;
        case "overflow":
          setStats((s) => ({ ...s, overflows: s.overflows + 1 }));
          appendOutput("\n[console output dropped: browser fell behind]\n");
          break;
        case "error":
          // Errors about a single command don't end a live session
          if (stateRef.current === "connected") break;
          setState("error");
          if (usingLoginCredentialsRef.current) {
            // The dev tools login works for the web API but SSH refused it; let the user enter others
            setUseManualCredentials(true);
            setStatusMessage(`${message.message} The dev tools login was rejected for SSH; enter credentials to retry.`);
          }
          break;
      }
    },
    [appendOutput, markClosed, setState],
  );

  const closeSocket = useCallback(() => {
    burstCancelRef.current = true;
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;
    socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "disconnect" }));
    }
    socket.close();
  }, []);

  useEffect(() => closeSocket, [closeSocket]);

  const connect = async () => {
    const credentials =
      !useManualCredentials && loginCredentials ? loginCredentials : { username, password };
    if (!appId || !credentials.username || !credentials.password) return;

    closeSocket();
    setCertUrl(null);
    setStats(emptyStats);
    setState("starting");
    setStatusMessage("Starting console session server");
    credentialsRef.current = credentials;
    usingLoginCredentialsRef.current = credentials === loginCredentials;

    let url: string;
    try {
      url = (await startSession({ appId }).unwrap()).url;
    } catch {
      setState("error");
      setStatusMessage("Essentials could not start the console session server");
      return;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        handleServerMessage(JSON.parse(event.data));
      } catch (e) {
        console.error("Failed to parse console session message", e);
      }
    };
    socket.onerror = () => {
      setState("error");
      setStatusMessage("WebSocket connection failed");
      setCertUrl(new URL(url.replace(/^wss:/, "https:")).origin);
    };
    socket.onclose = () => {
      socketRef.current = null;
      markClosed(stateRef.current === "error" ? "error" : "disconnected");
    };
  };

  const disconnect = () => {
    closeSocket();
    setState("disconnected");
    setStatusMessage("Disconnected");
    setStats((s) => ({ ...s, connectedAt: null }));
  };

  const stopServer = () => {
    disconnect();
    if (appId) stopSession({ appId });
  };

  //* SENDING ***********************************************************/
  const sendRaw = useCallback((data: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: "send", data }));
    setStats((s) => ({ ...s, commandsSent: s.commandsSent + 1 }));
    return true;
  }, []);

  const submitCommand = () => {
    if (!sendRaw(command + "\r\n")) return;
    if (command.trim()) setHistory((h) => [command, ...h.filter((c) => c !== command)].slice(0, 50));
    setHistoryIndex(-1);
    setCommand("");
  };

  const onCommandKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCommand();
    } else if (e.key === "ArrowUp" && history.length > 0) {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(next);
      setCommand(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setCommand(next >= 0 ? history[next] : "");
    }
  };

  // Stress test: fire the same command repeatedly to check the session keeps up
  const runBurst = async () => {
    burstCancelRef.current = false;
    setBursting(true);
    for (let i = 0; i < burstCount && !burstCancelRef.current; i++) {
      if (!sendRaw(burstCommand + "\r\n")) break;
      if (burstIntervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, burstIntervalMs));
      }
    }
    setBursting(false);
  };

  const onOutputScroll = () => {
    const el = outputRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom !== autoScroll) setAutoScroll(atBottom);
  };

  if (!appId) return null;

  const isOpen = state !== "disconnected" && state !== "error";
  const isConnected = state === "connected";

  //* RENDER ************************************************************/
  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h2 className="mb-0">SSH Console</h2>
        <Badge bg={stateVariant[state]}>{state}</Badge>
        <span className="small">{statusMessage}</span>
      </div>

      <Form
        className="d-flex align-items-center gap-2 mb-2 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isOpen) connect();
        }}
      >
        {useManualCredentials ? (
          <>
            <Form.Control
              size="sm"
              style={{ width: "12rem" }}
              placeholder="Username"
              autoComplete="username"
              value={username}
              disabled={isOpen}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Form.Control
              size="sm"
              style={{ width: "12rem" }}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              disabled={isOpen}
              onChange={(e) => setPassword(e.target.value)}
            />
            {loginCredentials && !isOpen && (
              <Button size="sm" variant="link" onClick={() => setUseManualCredentials(false)}>
                Use dev tools login
              </Button>
            )}
          </>
        ) : (
          <span className="small">
            As <strong>{loginCredentials?.username}</strong>
            {!isOpen && (
              <Button size="sm" variant="link" onClick={() => setUseManualCredentials(true)}>
                Use different credentials
              </Button>
            )}
          </span>
        )}
        {!isOpen ? (
          <Button
            size="sm"
            variant="success"
            type="submit"
            disabled={useManualCredentials && (!username || !password)}
          >
            Connect
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={disconnect}>
            Disconnect
          </Button>
        )}
        <Button size="sm" variant="outline-secondary" onClick={stopServer}>
          Stop Server
        </Button>
        <Button size="sm" variant="primary" onClick={() => setOutput("")}>
          Clear
        </Button>
        <Form.Check
          type="checkbox"
          id="sshConsoleAutoScroll"
          label="Auto-scroll"
          checked={autoScroll}
          onChange={(e) => setAutoScroll(e.target.checked)}
        />
      </Form>

      <div className="d-flex gap-3 mb-2 small flex-wrap">
        <span>
          Uptime: {stats.connectedAt ? formatDuration(now - stats.connectedAt) : "—"}
        </span>
        <span>Received: {stats.bytesReceived.toLocaleString()} chars</span>
        <span>Frames: {stats.framesReceived.toLocaleString()}</span>
        <span>Sent: {stats.commandsSent.toLocaleString()}</span>
        <span className={stats.drops ? "text-danger" : undefined}>Drops: {stats.drops}</span>
        <span className={stats.overflows ? "text-danger" : undefined}>
          Overflows: {stats.overflows}
        </span>
      </div>

      {certUrl && (
        <Alert variant="warning" className="py-2 px-3 mb-2" style={{ fontSize: "0.82rem" }}>
          <strong>Connection failed.</strong> The console server may have an untrusted certificate.{" "}
          <Alert.Link href={certUrl} target="_blank" rel="noreferrer">
            Open {certUrl} in a new tab
          </Alert.Link>
          {', accept the certificate, then press "Connect" again.'}
        </Alert>
      )}

      <pre
        ref={outputRef}
        onScroll={onOutputScroll}
        className="flex-grow-1 mb-2 p-2 rounded bg-dark text-light"
        style={{ overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", minHeight: 0 }}
      >
        {output}
      </pre>

      <InputGroup size="sm" className="mb-2">
        <Form.Control
          className="font-monospace"
          placeholder={isConnected ? "Console command (Enter to send, ↑/↓ for history)" : "Not connected"}
          value={command}
          disabled={!isConnected}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={onCommandKeyDown}
        />
        <Button variant="primary" disabled={!isConnected} onClick={submitCommand}>
          Send
        </Button>
      </InputGroup>

      <InputGroup size="sm">
        <InputGroup.Text>Burst</InputGroup.Text>
        <Form.Control
          className="font-monospace"
          value={burstCommand}
          disabled={bursting}
          onChange={(e) => setBurstCommand(e.target.value)}
        />
        <InputGroup.Text>×</InputGroup.Text>
        <Form.Control
          type="number"
          min={1}
          style={{ maxWidth: "6rem" }}
          value={burstCount}
          disabled={bursting}
          onChange={(e) => setBurstCount(Math.max(1, Number(e.target.value)))}
        />
        <InputGroup.Text>every</InputGroup.Text>
        <Form.Control
          type="number"
          min={0}
          style={{ maxWidth: "6rem" }}
          value={burstIntervalMs}
          disabled={bursting}
          onChange={(e) => setBurstIntervalMs(Math.max(0, Number(e.target.value)))}
        />
        <InputGroup.Text>ms</InputGroup.Text>
        {!bursting ? (
          <Button variant="outline-primary" disabled={!isConnected || !burstCommand} onClick={runBurst}>
            Run
          </Button>
        ) : (
          <Button variant="outline-danger" onClick={() => (burstCancelRef.current = true)}>
            Cancel
          </Button>
        )}
      </InputGroup>
    </div>
  );
};

export default SshConsole;
