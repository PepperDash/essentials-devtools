import { Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { ApiPaths } from './features/ApiPaths';
import ConfigFile from "./features/ConfigFile";
import DebugConsole from "./features/DebugConsole/DebugConsole";
import DeviceList from "./features/DeviceList";
import ErrorBoundary from "./features/ErrorBoundary";
import InitializationExceptions from "./features/InitializationExceptions";
import LoginForm from "./features/LoginForm";
import MainLayout from "./features/MainLayout";
import MobileControl from './features/MobileControl';
import RequireAuth from "./features/RequireAuth";
import Routing from './features/Routing';
import Types from "./features/Types";
import Versions from "./features/Versions";
import {
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
} from "./store/apiSlice";
import { AppDispatch, RootState } from "./store/store";
import { messagesCleared, WS_CONNECT, WS_DISCONNECT } from "./store/websocketSlice";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const isConnected = useSelector((state: RootState) => state.websocket.isConnected);

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();

  //* FUNCTIONS *******************************************************/
  const join = async (appId: string) => {
    if (!appId) return;
    const res = await startSession({ appId }).unwrap();
    const primaryUrl = res.fallbackUrl || res.url;
    const fallbackUrl = res.fallbackUrl ? res.url : undefined;
    console.log("Joining debug session at " + primaryUrl + (fallbackUrl ? " (fallback: " + fallbackUrl + ")" : ""));
    dispatch({ type: WS_CONNECT, payload: { url: primaryUrl, fallbackUrl } });
  };

  const stop = (appId: string) => {
    console.log("Stopping debug session");
    dispatch({ type: WS_DISCONNECT });
    if (!appId) return;
    stopSession({ appId });
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
          
        <Route path=":appId/login" element={<LoginForm />} />
        <Route path=":appId" element={<MainLayout isConnected={isConnected} />}>
          <Route element={<RequireAuth />}>
            <Route path="versions" element={<Versions />} />
            <Route path="apiPaths" element={<ApiPaths />} />
            <Route path="initializationExceptions" element={<InitializationExceptions />} />
            <Route path="config" element={<ConfigFile />} />
            <Route path="devices" element={<DeviceList />} />
            <Route path="types" element={<Types />} />
            <Route path="routing" element={<Routing />} />
            <Route path="mobileControl" element={<MobileControl />} />
            <Route
              path="console"
              element={
                <DebugConsole
                  isConnected={isConnected}
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
