import { Suspense, useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ApiPaths } from './features/ApiPaths';
import ConfigFile from './features/ConfigFile';
import DebugConsole from './features/DebugConsole/DebugConsole';
import DeviceList from './features/DeviceList';
import ErrorBoundary from './features/ErrorBoundary';
import Help from './features/Help/Help';
import InitializationExceptions from './features/InitializationExceptions';
import LoginForm from './features/LoginForm';
import MainLayout from './features/MainLayout';
import MobileControl from './features/MobileControl';
import RequireAuth from './features/RequireAuth';
import Routing from './features/Routing';
import Secrets from './features/Secrets';
import Types from './features/Types';
import Versions from './features/Versions';
import {
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
} from './store/apiSlice';
import { AppDispatch, RootState } from './store/store';
import {
  connectionAttemptStarted,
  disconnected,
  messagesCleared,
  WS_CONNECT,
  WS_DISCONNECT,
} from './store/websocketSlice';

function getRouteAppId(pathname: string) {
  const [firstSegment] = pathname.replace(/^\/+/, '').split('/');

  if (!firstSegment || firstSegment === 'help' || firstSegment === 'login') {
    return null;
  }

  return firstSegment;
}

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const location = useLocation();
  const isConnected = useSelector(
    (state: RootState) => state.websocket.isConnected
  );
  const isConnecting = useSelector(
    (state: RootState) => state.websocket.isConnecting
  );

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();
  const currentAppId = getRouteAppId(location.pathname);
  const routeAppIdRef = useRef(currentAppId);
  const previousAppIdRef = useRef(currentAppId);
  const joinRequestIdRef = useRef(0);

  useEffect(() => {
    routeAppIdRef.current = currentAppId;
  }, [currentAppId]);

  useEffect(() => {
    const previousAppId = previousAppIdRef.current;
    previousAppIdRef.current = currentAppId;

    if (previousAppId === null || previousAppId === currentAppId) {
      return;
    }

    joinRequestIdRef.current += 1;
    dispatch({ type: WS_DISCONNECT });
  }, [currentAppId, dispatch]);

  //* FUNCTIONS *******************************************************/
  const join = async (appId: string) => {
    // Ignore repeat clicks until the current attempt connects or fails. Read
    // the store directly so a click before re-render still sees the flag
    const { isConnecting, isConnected } = store.getState().websocket;
    if (!appId || isConnecting || isConnected) return;
    const requestId = ++joinRequestIdRef.current;
    dispatch(connectionAttemptStarted());
    try {
      const res = await startSession({ appId }).unwrap();
      if (
        joinRequestIdRef.current !== requestId ||
        routeAppIdRef.current !== appId
      ) {
        return;
      }
      // The server already picks the URL on the browser's side of the network
      const { url, fallbackUrl } = res;
      console.log(
        'Joining debug session at ' +
          url +
          (fallbackUrl ? ' (fallback: ' + fallbackUrl + ')' : '')
      );
      dispatch({ type: WS_CONNECT, payload: { url, fallbackUrl } });
    } catch (err) {
      if (
        joinRequestIdRef.current !== requestId ||
        routeAppIdRef.current !== appId
      ) {
        return;
      }
      console.error('Failed to start debug session', err);
      dispatch(disconnected());
    }
  };

  const stop = (appId: string) => {
    console.log('Stopping debug session');
    dispatch({ type: WS_DISCONNECT });
    if (!appId) return;
    void stopSession({ appId });
  };

  const clear = () => {
    dispatch(messagesCleared());
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="help/*" element={<Help />} />

          <Route path=":appId/login" element={<LoginForm />} />
          <Route
            path=":appId"
            element={<MainLayout isConnected={isConnected} />}
          >
            <Route element={<RequireAuth />}>
              <Route path="versions" element={<Versions />} />
              <Route path="apiPaths" element={<ApiPaths />} />
              <Route
                path="initializationExceptions"
                element={<InitializationExceptions />}
              />
              <Route path="config" element={<ConfigFile />} />
              <Route path="devices" element={<DeviceList />} />
              <Route path="types" element={<Types />} />
              <Route path="routing" element={<Routing />} />
              <Route path="mobileControl" element={<MobileControl />} />
              <Route path="secrets" element={<Secrets />} />
              <Route
                path="console"
                element={
                  <DebugConsole
                    isConnected={isConnected}
                    isConnecting={isConnecting}
                    join={join}
                    stop={stop}
                    clear={clear}
                  />
                }
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
