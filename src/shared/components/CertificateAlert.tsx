import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';

/** The https origin a failed ws/wss URL needs the browser to trust; null for an unparseable URL. */
const certificateOrigin = (wsUrl: string): string | null => {
  try {
    return new URL(wsUrl).origin
      .replace(/^wss:/, 'https:')
      .replace(/^ws:/, 'http:');
  } catch {
    return null;
  }
};

interface CertificateAlertProps {
  /** The ws/wss URLs that failed to connect */
  failedUrls: string[];
  /** Called to try the connection again */
  onRetry: () => void;
  /** Wording for what failed, e.g. "The debug console connection" */
  subject?: string;
}

/**
 * Shown when a secure WebSocket can't connect, which is usually the browser refusing the
 * processor's self-signed certificate. A WebSocket gives no way to tell that apart from any other
 * failure, and the browser won't offer to accept the certificate for it, so this opens the server's
 * https address in a new tab where the browser will. When the user comes back to this tab the
 * connection is retried once, so they don't have to find and click anything.
 */
const CertificateAlert = ({
  failedUrls,
  onRetry,
  subject = 'The live connection',
}: CertificateAlertProps) => {
  const origins = [
    ...new Set(
      failedUrls
        .map(certificateOrigin)
        .filter((origin): origin is string => origin !== null)
    ),
  ];
  const [opened, setOpened] = useState(false);

  // Keep the latest callback without re-subscribing the focus listener on every render
  const retryRef = useRef(onRetry);
  useEffect(() => {
    retryRef.current = onRetry;
  }, [onRetry]);

  // After the certificate tab was opened, retry once when the user returns to this one
  useEffect(() => {
    if (!opened) return;
    let fired = false;
    const onReturn = () => {
      if (document.visibilityState === 'hidden' || fired) return;
      fired = true;
      setOpened(false);
      retryRef.current();
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [opened]);

  if (origins.length === 0) return null;

  return (
    <Alert variant="warning" className="mb-2 py-2 px-3" role="alert">
      <div className="fw-semibold">{subject} couldn&apos;t be established.</div>
      <div className="small mb-2">
        This is usually because the browser doesn&apos;t trust the
        processor&apos;s certificate yet. Open the page below in a new tab,
        choose to proceed past the warning, then come back here. The connection
        retries automatically.
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        {origins.map((origin) => (
          <Button
            key={origin}
            variant="warning"
            size="sm"
            onClick={() => {
              window.open(origin, '_blank', 'noopener,noreferrer');
              setOpened(true);
            }}
          >
            Open {origin} to accept the certificate
          </Button>
        ))}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => {
            setOpened(false);
            onRetry();
          }}
        >
          Try again
        </Button>
        {opened && (
          <span className="small text-muted">
            Waiting for you to accept the certificate…
          </span>
        )}
      </div>
    </Alert>
  );
};

export default CertificateAlert;
