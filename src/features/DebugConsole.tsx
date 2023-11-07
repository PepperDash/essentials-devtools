import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { useGetDebugSessionQuery, useStopDebugSessionMutation } from '../store/apiSlice';

const DebugConsole = () => {
  const [websocket, setWebsocket] = useState<WebSocket>();
  const dispatch = useDispatch();

  const { data: debugSession } = useGetDebugSessionQuery();
  const [ stopSession ] = useStopDebugSessionMutation();

  const join = () => {
    if (!debugSession) return;

    console.log('Joining debug session');

    setWebsocket(() => {
      const ws = new WebSocket(debugSession.url);
      ws.onmessage = onMessage;
      ws.onclose = () => {
        dispatch({ type: 'DISCONNECTED' })
      };
      return ws;
    })
  }

  const stop = () => {
    if (!websocket) return;

    console.log('Stopping debug session');
    websocket.close();
    stopSession();
  }

  const onMessage = (event: { data: string; }) => {
    const data = JSON.parse(event.data);
    console.log(data);
  }

  return (
  <>
    <Button variant='primary' size='sm' onClick={join}>Start Debug Session</Button>
    <Button variant='primary' size='sm' onClick={stop}>Stop Debug Session</Button>

  </>
  );
}

export default DebugConsole;

