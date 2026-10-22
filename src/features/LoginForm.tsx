import { FormEvent, useState } from 'react';
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import EyeIcon from '../shared/components/EyeIcon';
import { getCandidateAppIds } from '../shared/functions/hostPaths';
import useAppParams from '../shared/hooks/useAppParams';
import { useSetLoginCredentialsMutation } from '../store/apiSlice';
import {
  selectAvailableApps,
  selectIsAuthenticated,
} from '../store/auth/authSelectors';
import { isAuthenticationDisabledError } from '../store/auth/authErrors';
import { authActions } from '../store/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

// app01..app10 on an appliance; just the room on Virtual Control
const ALL_APP_IDS = getCandidateAppIds();

const LoginForm = () => {
  const { appId } = useAppParams();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const discoveredApps = useAppSelector(selectAvailableApps);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setLoginCredentials({ appId: id, username, password }).unwrap()
      )
    );

    // A program with authentication turned off (e.g. a VC-4 room, whose web server signs users in
    // itself) refuses the login with a specific error. There's nothing to sign in to, so it counts.
    const availableApps = ALL_APP_IDS.filter((_, i) => {
      const result = results[i];
      return (
        result.status === 'fulfilled' ||
        isAuthenticationDisabledError(result.reason)
      );
    });

    setIsLoading(false);

    if (availableApps.length === 0) {
      setError('Invalid credentials. Please try again.');
      return;
    }

    dispatch(authActions.loginSuccess(availableApps));

    const destination = from ?? `/${availableApps[0] ?? probeAppId}/versions`;
    void navigate(destination, { replace: true });
  }

  return (
    <div className="d-flex flex-column justify-content-center align-items-center h-100 position-relative">
      <div className="position-absolute top-0 end-0 p-2 d-flex align-items-center gap-3">
        <Link to="/help" className="text-muted small">
          Help
        </Link>
        <span className="text-muted small">Version: {APP_VERSION}</span>
      </div>
      <h1 className="mb-5 text-center">
        PepperDash Essentials Developer Tools
      </h1>
      <div className="w-100" style={{ maxWidth: '360px' }}>
        <h2 className="mb-4">Sign In</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={(e) => void handleSubmit(e)}>
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
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <EyeIcon slashed={showPassword} />
              </Button>
            </InputGroup>
          </Form.Group>
          <Button type="submit" className="w-100" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner as="span" size="sm" className="me-2" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
