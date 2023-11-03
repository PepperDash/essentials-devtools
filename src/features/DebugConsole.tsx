import { useState } from 'react';
import { useDispatch } from 'react-redux';

const DebugConsole = () => {
  const [websocket, setWebsocket] = useState<WebSocket>();
  const dispatch = useDispatch();

  const join = () => {
    const URL = `ws://localhost:8080/ws`
    setWebsocket(() => {
      const ws = new WebSocket(URL);
      ws.onmessage = onMessage;
      ws.onclose = () => {
        dispatch({ type: 'DISCONNECTED' })
      };
      return ws;
    })
  }

  const onMessage = (event: { data: string; }) => {
    const data = JSON.parse(event.data);
    console.log(data);
  }

  return (
  <>
  </>
  );
}

export default DebugConsole;