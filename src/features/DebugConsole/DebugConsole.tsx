import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import ListFiltersHeader from "../../shared/ListFiltersHeader";
import useAppParams from '../../shared/hooks/useAppParams';
import { LogMessage } from '../../shared/types/LogMessage';
import {
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useSetLoadConfigMutation,
  useSetRestartMutation
} from "../../store/apiSlice";
import ConsoleWindow from "./ConsoleWindow";
import { DebugFilters } from "./DebugFilters";
import MinimumLogLevelDropdown from './MinimumLogLevelDropdown';
import RestartConfirmModal from "./RestartConfirmModal";
import { useFilteredMessages } from "./hooks/useFilteredMessages";

const DebugConsole = ({messages, isConnected, join, stop, clear}: DebugConsoleProps) => {
  //* HOOKS ***********************************************************/
  const [showModal, setShowModal] = useState(false);
  const { appId } = useAppParams();

  const { data: doNotLoadConfigOnNextBoot } =
    useGetDoNotLoadConfigOnNextBootQuery(appId ? { appId } : skipToken);

  const [setDoNotLoadConfig] = useSetDoNotLoadConfigOnNextBootMutation();
  const [restart] = useSetRestartMutation();
  const [loadConfig] = useSetLoadConfigMutation();

  //* EFFECTS *********************************************************/
  const filteredItems = useFilteredMessages(messages);

  const clickRestart = () => {
    setShowModal(true);
  };

  const clickLoadConfig = () => {
    if(!appId) return;
    console.log("Loading config");
    loadConfig({ appId });
  };

  if (!doNotLoadConfigOnNextBoot || !appId) return null;

  //* RENDER **********************************************************/
  return (
    <>
      <div className="d-flex flex-column overflow-hidden h-100">
        <div className="d-flex align-items-center justify-content-start mb-2">
          <h2>Debug Console</h2>
        </div>
        <div className="d-flex align-items-center justify-content-start mb-2">
          {!isConnected ? (
          <Button className="mx-1" variant="primary" size="sm" onClick={() => join(appId)}>
            Start Debug Session
          </Button>
          )
          : (
            <Button className="mx-1" variant="primary" size="sm" onClick={() => stop(appId)}>
            Stop Debug Session
          </Button>
          )}
          <MinimumLogLevelDropdown />
          <Form.Check
            type="checkbox"
            className="mx-1"
            label="Do Not Load Config on Next Boot"
            name="doNotLoadConfig"
            id="doNotLoadConfig"
            checked={doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot}
            onChange={() => {
              if(!appId) return;
              setDoNotLoadConfig(
                { appId, doNotLoadConfigOnNextBoot: !doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot }
              )
            }}
          />
          {doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot && (
          <Button
            className="mx-1"
            variant="primary"
            size="sm"
            onClick={clickLoadConfig}
            disabled={!doNotLoadConfigOnNextBoot.doNotLoadConfigOnNextBoot}
          >
            Load Config
          </Button>)}
          <Button
            className="mx-1"
            variant="primary"
            size="sm"
            onClick={clear}
          >
            Clear Console Trace
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
          if(!appId) return;
          restart({ appId });
          setShowModal(false);
        }}
      />
    </>
  );
};

export default DebugConsole;


interface DebugConsoleProps {
  messages: LogMessage[];
  isConnected: boolean;
  join: (appId: string) => void;
  stop: (appId: string) => void;
  clear: () => void;
}

