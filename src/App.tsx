import { Suspense, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import ConfigFile from "./features/ConfigFile";
import DebugConsole from "./features/DebugConsole/DebugConsole";
import DeviceList from "./features/DeviceList";
import MainLayout from "./features/MainLayout";
import MobileControl from './features/MobileControl';
import Types from "./features/Types";
import Versions from "./features/Versions";
import { LogMessage } from "./shared/types/LogMessage";
import {
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
} from "./store/apiSlice";

function App() {
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const dispatch = useDispatch();

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();

  //* FUNCTIONS *******************************************************/
  const join = async (appId: string) => {
    if (!appId) return;
    const res = await startSession({ appId }).unwrap();

    console.log("Joining debug session at " + res.url);

    console.log("Connecting to debug session");
    const ws = new WebSocket(res.url);
    ws.onerror = (err) => {
      console.log("Websocket error", err);
    };
    ws.onmessage = onMessage;
    ws.onclose = () => {
      dispatch({ type: "DISCONNECTED" });
      setIsConnected(false);
    };
    ws.onopen = () => {
      dispatch({ type: "CONNECTED" });
      setIsConnected(true);
    };

    setWebsocket(ws);
  };

  const stop = (appId: string) => {
    if (!websocket) return;

    console.log("Stopping debug session");
    websocket.close();
    if (!appId) return;
    stopSession({ appId });
  };

  const clear = () => {
    setMessages([]);
  };

  const onMessage = (event: { data: string }) => {
    const newMsg = JSON.parse(event.data);
    // console.log(data);

    // Set the messages array as a new array to trigger a re-render of child components
    setMessages((current) => [...current, newMsg]);
  };

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/app01/versions" replace />} />
        <Route path=":appId" element={<MainLayout isConnected={isConnected} />}>
          <Route path="versions" element={<Versions />} />
          <Route path="config" element={<ConfigFile />} />
          <Route path="devices" element={<DeviceList />} />
          <Route path="types" element={<Types />} />
          <Route path="mobileControl" element={<MobileControl />} />
          <Route
            path="console"
            element={
              <DebugConsole
                messages={messages}
                isConnected={isConnected}
                join={join}
                stop={stop}
                clear={clear}
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
