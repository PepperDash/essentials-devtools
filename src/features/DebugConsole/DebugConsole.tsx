import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import ListFiltersHeader from "../../shared/ListFiltersHeader";
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

const DebugConsole = ({messages, join, stop}: DebugConsoleProps) => {
  //* HOOKS ***********************************************************/
  const [showModal, setShowModal] = useState(false);

  const { data: doNotLoadConfigOnNextBoot } =
    useGetDoNotLoadConfigOnNextBootQuery();

  const [setDoNotLoadConfig] = useSetDoNotLoadConfigOnNextBootMutation();
  const [restart] = useSetRestartMutation();
  const [loadConfig] = useSetLoadConfigMutation();

  //* EFFECTS *********************************************************/
  const filteredItems = useFilteredMessages(messages);

  const clickRestart = () => {
    setShowModal(true);
  };

  const clickLoadConfig = () => {
    console.log("Loading config");
    loadConfig();
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


interface DebugConsoleProps {
  messages: LogMessage[];
  join: () => void;
  stop: () => void;
}

