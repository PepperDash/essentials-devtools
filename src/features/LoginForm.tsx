import { FormEvent, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAppParams from '../shared/hooks/useAppParams';
import { useSetLoginCredentialsMutation } from '../store/apiSlice';
import {
  selectAvailableApps,
  selectIsAuthenticated,
} from '../store/auth/authSelectors';
import { authActions } from '../store/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const ALL_APP_IDS = [
  "app01",
  "app02",
  "app03",
  "app04",
  "app05",
  "app06",
  "app07",
  "app08",
  "app09",
  "app10",
];

const LoginForm = () => {
  const { appId } = useAppParams();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const discoveredApps = useAppSelector(selectAvailableApps);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [setLoginCredentials] = useSetLoginCredentialsMutation();

  const from = (location.state as { from?: Location })?.from?.pathname;

  const isValidAppId = appId && ALL_APP_IDS.includes(appId);
  const probeAppId = isValidAppId ? appId : ALL_APP_IDS[0];
  const safeAppId = isValidAppId ? appId : (discoveredApps[0] ?? probeAppId);

  if (isAuthenticated) {
    return <Navigate to={from ?? `/${safeAppId}/versions`} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Send login to all program slots in parallel
    const results = await Promise.allSettled(
      ALL_APP_IDS.map((id) =>
        setLoginCredentials({ appId: id, username, password }).unwrap(),
      ),
    );

    const availableApps = ALL_APP_IDS.filter(
      (_, i) => results[i].status === "fulfilled",
    );

    setIsLoading(false);

    if (availableApps.length === 0) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    dispatch(authActions.loginSuccess(availableApps));

    const destination = from ?? `/${availableApps[0] ?? probeAppId}/versions`;
    navigate(destination, { replace: true });
  }

  return (
    <div className="d-flex flex-column justify-content-center align-items-center h-100 position-relative">
      <span className="position-absolute top-0 end-0 p-2 text-muted small">
        Version: {APP_VERSION}
      </span>
      <h1 className="mb-5 text-center">
        PepperDash Essentials Developer Tools
      </h1>
      <div className="w-100" style={{ maxWidth: "360px" }}>
        <h2 className="mb-4">Sign In</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="username">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </Form.Group>
          <Form.Group className="mb-4" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </Form.Group>
          <Button type="submit" className="w-100" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner as="span" size="sm" className="me-2" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
