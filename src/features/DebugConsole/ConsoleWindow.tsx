import { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import ScrollToBottom from "react-scroll-to-bottom";
import { LogMessage } from "../../shared/types/LogMessage";
import LogMessageDetailDrawer from "./LogMessageDetailDrawer";

const Content = ({ filteredItems }: ConsoleWindowProps) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LogMessage>();

  function clickItem(message: LogMessage) {
    setShowDrawer(true);
    setSelectedItem(message);
  }

  function handleClose() {
    setShowDrawer(false);
    setSelectedItem(undefined);
  }

  return (
    <>
      <Container fluid className='table-striped'>
        {filteredItems.map((message, index) => (
          <Row
            key={index}
            onClick={() => clickItem(message)}
            className={(selectedItem === message ? "bg-primary text-white cursor-pointer" : "cursor-pointer") + (index % 2 === 0 ? " bg-light" : " 2bg-white")}
          >
            <Col md={6}>{message.Timestamp}</Col>
            <Col md={3}>{message.Properties?.Key || "global"}</Col>
            <Col md={2}>{message.Level}</Col>
            <Col md={13} className="text-nowrap text-truncate">
              {message.RenderedMessage}
            </Col>
          </Row>
        ))}
      </Container>

      <LogMessageDetailDrawer
        show={showDrawer}
        message={selectedItem}
        handleClose={handleClose}
      />
    </>
  );
};

const ConsoleWindow = ({ filteredItems }: ConsoleWindowProps) => {
  return (
    <>
      <Container fluid>
        <Row className="fw-bold">
          <Col md={6}>Timestamp</Col>
          <Col md={3}>Key</Col>
          <Col md={2}>Level</Col>
          <Col md={13}>Message</Col>
        </Row>
      </Container>

      <ScrollToBottom
        className="overflow-auto flex-grow-1"
        followButtonClassName="btn btn-sm btn-outline-secondary"
        mode="bottom"
        initialScrollBehavior='auto'
      >
        <Content filteredItems={filteredItems} />
      </ScrollToBottom>
    </>
  );
};

export default ConsoleWindow;

interface ConsoleWindowProps {
  filteredItems: LogMessage[];
}
