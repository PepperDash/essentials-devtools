import { Offcanvas } from "react-bootstrap";
import { LogMessage } from "../../shared/types/LogMessage";

const LogMessageDetailDrawer = ({
  show,
  message,
  handleClose,
}: LogMessageDetailDrawerProps) => {
  if (!message) return null;

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      backdrop={false}
      className="right-drawer shadow-sm border p-3"
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Message Detail</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div>
          <h5>Timestamp</h5>
          {message.Timestamp}
        </div>
        <div>
          <h5>Rendered Message</h5>
          {message.RenderedMessage}
        </div>
        <div>
          <h5>Message Template</h5>
          {message.MessageTemplate}
        </div>
        <div>
          <h5>Properties</h5>
          <pre>{JSON.stringify(message.Properties, null, 2)}</pre>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default LogMessageDetailDrawer;

interface LogMessageDetailDrawerProps {
  show: boolean;
  message: LogMessage | undefined;
  handleClose: () => void;
}
