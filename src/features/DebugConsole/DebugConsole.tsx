import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useDispatch } from "react-redux";
import ListFiltersHeader from "../../shared/ListFiltersHeader";
import { LogMessage } from '../../shared/types/LogMessage';
import {
  useGetDebugSessionMutation,
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useSetLoadConfigMutation,
  useSetRestartMutation,
  useStopDebugSessionMutation,
} from "../../store/apiSlice";
import ConsoleWindow from "./ConsoleWindow";
import { DebugFilters } from "./DebugFilters";
import MinimumLogLevelDropdown from './MinimumLogLevelDropdown';
import RestartConfirmModal from "./RestartConfirmModal";
import { useFilteredMessages } from "./hooks/useFilteredMessages";

const DebugConsole = () => {
  //* HOOKS ***********************************************************/
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [showModal, setShowModal] = useState(false);
  const dispatch = useDispatch();

  const { data: doNotLoadConfigOnNextBoot } =
    useGetDoNotLoadConfigOnNextBootQuery();

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();
  const [setDoNotLoadConfig] = useSetDoNotLoadConfigOnNextBootMutation();
  const [restart] = useSetRestartMutation();
  const [loadConfig] = useSetLoadConfigMutation();

  //* EFFECTS *********************************************************/
  const filteredItems = useFilteredMessages(messages);

  //* FUNCTIONS *******************************************************/
  const join = async () => {
    const res = await startSession().unwrap();

    console.log("Joining debug session at " + res.url);

    console.log("Connecting to debug session");
    const ws = new WebSocket(res.url);
    ws.onmessage = onMessage;
    ws.onclose = () => {
      dispatch({ type: "DISCONNECTED" });
    };

    setWebsocket(ws);
  };

  const stop = () => {
    if (!websocket) return;

    console.log("Stopping debug session");
    websocket.close();
    stopSession();
  };

  const clickRestart = () => {
    setShowModal(true);
  };

  const clickLoadConfig = () => {
    console.log("Loading config");
    loadConfig();
  };

  const onMessage = (event: { data: string }) => {
    const data = JSON.parse(event.data);
    // console.log(data);
    setMessages((messages) => [...messages, data]);
  };

  if (!doNotLoadConfigOnNextBoot) return null;

  //* RENDER **********************************************************/
  return (
    <>
      <div className="d-flex flex-column overflow-hidden h-100">
        <div className="d-flex align-items-center justify-content-start mb-2">
          <h2>Debug Console</h2>
        </div>
        <div className="d-flex align-items-center justify-content-start mb-2">
          <Button className="mx-1" variant="primary" size="sm" onClick={join}>
            Start Debug Session
          </Button>
          <Button className="mx-1" variant="primary" size="sm" onClick={stop}>
            Stop Debug Session
          </Button>
          <MinimumLogLevelDropdown />
          <Form.Check
            type="checkbox"
            className="mx-1"
            label="Do Not Load Config on Next Boot"
            name="doNotLoadConfig"
            id="doNotLoadConfig"
            checked={doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot}
            onChange={() =>
              setDoNotLoadConfig(
                !doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot
              )
            }
          />
          <Button
            className="mx-1"
            variant="primary"
            size="sm"
            onClick={clickLoadConfig}
            disabled={!doNotLoadConfigOnNextBoot.doNotLoadConfigOnNextBoot}
          >
            Load Config
          </Button>
          <Button
            className="mx-1"
            variant="primary"
            size="sm"
            onClick={clickRestart}
          >
            Restart Program
          </Button>
          <span className="ps-2">Message Count: {messages.length}</span>
        </div>
        <ListFiltersHeader showSearch filters={<DebugFilters />} />
        <ConsoleWindow filteredItems={filteredItems}/>
      </div>

      <RestartConfirmModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        handleConfirm={() => {
          restart();
          setShowModal(false);
        }}
      />
    </>
  );
};

export default DebugConsole;


