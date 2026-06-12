import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import ListFiltersHeader from '../../shared/ListFiltersHeader';
import useAppParams from '../../shared/hooks/useAppParams';
import {
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useSetLoadConfigMutation,
  useSetRestartMutation
} from '../../store/apiSlice';
import { selectSearchText } from '../../store/debugConsole/debugConsoleSelectors';
import { debugConsoleActions } from '../../store/debugConsole/debugConsoleSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { RootState } from '../../store/store';
import ConsoleWindow from './ConsoleWindow';
import { DebugFilters } from './DebugFilters';
import MinimumLogLevelDropdown from './MinimumLogLevelDropdown';
import RestartConfirmModal from './RestartConfirmModal';
import { useFilteredMessages } from './hooks/useFilteredMessages';

const DebugConsole = ({isConnected, join, stop, clear}: DebugConsoleProps) => {
  //* HOOKS ***********************************************************/
  const [showModal, setShowModal] = useState(false);
  const { appId } = useAppParams();
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state: RootState) => state.websocket.messages);
  const failedUrls = useAppSelector((state: RootState) => state.websocket.failedUrls);
  const searchText = useAppSelector(selectSearchText);
  const certUrls = failedUrls
    ? failedUrls.map((u: string) => new URL(u).origin.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'))
    : null;

  const { data: doNotLoadConfigOnNextBoot } =
    useGetDoNotLoadConfigOnNextBootQuery(appId ? { appId } : skipToken);

  const [setDoNotLoadConfig] = useSetDoNotLoadConfigOnNextBootMutation();
  const [restart] = useSetRestartMutation();
  const [loadConfig] = useSetLoadConfigMutation();

  //* EFFECTS *********************************************************/
  const filteredItems = useFilteredMessages(messages);

  const exportFilteredItems = () => {
    const content = filteredItems
      .map((item) => `${item.Timestamp} [${item.Level}]${item.Properties?.Key ? ` [${item.Properties.Key}]` : ''} ${item.RenderedMessage}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

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
          <Button className="mx-1" variant="success" size="sm" onClick={() => join(appId)}>
            Start Debug Session
          </Button>
          )
          : (
            <Button className="mx-1" variant="danger" size="sm" onClick={() => stop(appId)}>
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
            onClick={exportFilteredItems}
            disabled={filteredItems.length === 0}
          >
            Export Log
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
        {certUrls && certUrls.length > 0 && (
          <Alert variant="warning" className="py-2 px-3 mb-2" style={{ fontSize: '0.82rem' }}>
            <strong>Connection failed.</strong> The debug server may have an untrusted certificate.{' '}
            {certUrls.map((certUrl: string, i: number) => (
              <span key={certUrl}>
                {i > 0 && ' or '}
                <Alert.Link href={certUrl} target="_blank" rel="noreferrer">
                  Open {certUrl} in a new tab
                </Alert.Link>
              </span>
            ))}
            {', accept the certificate, then try "Start Debug Session" again.'}
          </Alert>
        )}
        <ListFiltersHeader
          showSearch
          searchValue={searchText}
          onSearchChange={(val) => dispatch(debugConsoleActions.setSearchText(val))}
          filters={<DebugFilters />}
        />
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
  isConnected: boolean;
  join: (appId: string) => void;
  stop: (appId: string) => void;
  clear: () => void;
}

