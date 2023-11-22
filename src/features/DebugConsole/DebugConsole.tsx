import { useState } from "react";
import { Button } from "react-bootstrap";
import { useDispatch } from "react-redux";
import ListFiltersHeader from "../../shared/ListFiltersHeader";
import {
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
} from "../../store/apiSlice";
import ConsoleWindow from './ConsoleWindow';
import { DebugFilters } from "./DebugFilters";
import { useFilteredMessages } from "./hooks/useFilteredMessages";

const DebugConsole = () => {
  //* HOOKS ***********************************************************/
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [messages, setMessages] = useState<Message[]>([]);
  const dispatch = useDispatch();

  const [startSession] = useGetDebugSessionMutation();
  const [stopSession] = useStopDebugSessionMutation();

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
    // console.log(data);
    setMessages((messages) => [...messages, data]);
  };

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
      <div className="d-flex align-items-center justify-content-start">
        <Button className="mx-1" variant="primary" size="sm" onClick={join}>
          Start Debug Session
        </Button>
        <Button className="mx-1" variant="primary" size="sm" onClick={stop}>
          Stop Debug Session
        </Button>
        <span className="ps-2">Message Count: {messages.length}</span>
      </div>
      <div className="d-flex align-items-center justify-content-start">
        <h5>Debug Console</h5>
      </div>
      <ListFiltersHeader showSearch filters={<DebugFilters />} />
      <ConsoleWindow filteredItems={filteredItems} />
    </>
  );
};

export default DebugConsole;

export interface Message {
  Timestamp: string;
  MessageTemplate: string;
  Level: string;
  Properties?: {
    Key: string;
  };
}
