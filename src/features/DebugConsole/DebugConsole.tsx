import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useDispatch } from "react-redux";
import ListFiltersHeader from "../../shared/ListFiltersHeader";
import {
  useGetDebugSessionMutation,
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useStopDebugSessionMutation,
} from "../../store/apiSlice";
import ConsoleWindow from "./ConsoleWindow";
import { DebugFilters } from "./DebugFilters";
import { useFilteredMessages } from "./hooks/useFilteredMessages";

const DebugConsole = () => {
  //* HOOKS ***********************************************************/
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messages, setMessages] = useState<Message[]>([]);
  const dispatch = useDispatch();

  const { data: doNotLoadConfigOnNextBoot } =
    useGetDoNotLoadConfigOnNextBootQuery();

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();
  const [setDoNotLoadConfig] = useSetDoNotLoadConfigOnNextBootMutation();

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

  const onMessage = (event: { data: string }) => {
    const data = JSON.parse(event.data);
    console.log(data);
    setMessages((messages) => [...messages, data]);
  };

  if (!doNotLoadConfigOnNextBoot) return null;

  //* RENDER **********************************************************/
  return (
    <>
      {/* <HeaderScrollerFooter
      headerElements={
        <>
          <div className="d-flex align-items-center justify-content-start">
            <Button className="mx-1" variant="primary" size="sm" onClick={join}>
              Start Debug Session
            </Button>
            <Button className="mx-1" variant="primary" size="sm" onClick={stop}>
              Stop Debug Session
            </Button>
            <span className='ps-2'>Message Count: {messages.length}</span>
          </div>
          <div className="d-flex align-items-center justify-content-start">
            <h5>Debug Console</h5>
          </div>

          <ListFiltersHeader showSearch filters={<DebugFilters />} />
        </>
      }
      scrollingElements={
        <>
          <table className="table table-sm table-striped table-hover">
            <thead className='bg-body'>
              <tr>
                <th>Timestamp</th>
                <th>Key</th>
                <th>Level</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((message, index) => (
                <tr key={index}>
                  <td>{message.Timestamp}</td>
                  <td>{message.Properties?.Key || "global"}</td>
                  <td>{message.Level}</td>
                  <td>{message.MessageTemplate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
    /> */}
      <div className="d-flex flex-column overflow-hidden h-100">
        <div className="d-flex align-items-center justify-content-start">
          <Button className="mx-1" variant="primary" size="sm" onClick={join}>
            Start Debug Session
          </Button>
          <Button className="mx-1" variant="primary" size="sm" onClick={stop}>
            Stop Debug Session
          </Button>
          <Form.Check
            type="checkbox" 
            className="m-2" 
            label="Do Not Load Config on Next Boot" 
            name="doNotLoadConfig" 
            id="doNotLoadConfig" 
            checked={doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot}
            onChange={() => setDoNotLoadConfig(!doNotLoadConfigOnNextBoot?.doNotLoadConfigOnNextBoot)}
          />
          <span className="ps-2">Message Count: {messages.length}</span>
        </div>
        <div className="d-flex align-items-center justify-content-start">
          <h5>Debug Console</h5>
        </div>
        <ListFiltersHeader showSearch filters={<DebugFilters />} />
        <ConsoleWindow filteredItems={filteredItems} />
      </div>
    </>
  );
};

export default DebugConsole;

export interface Message {
  Timestamp: string;
  MessageTemplate: string;
  RenderedMessage: String;
  Level: string;
  Properties?: {
    Key: string;
  };
}
