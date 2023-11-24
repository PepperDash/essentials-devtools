import { Col, Container, Row } from "react-bootstrap";
import ScrollToBottom from "react-scroll-to-bottom";
import { Message } from "./DebugConsole";

const Content = ({ filteredItems }: ConsoleWindowProps) => {
  return (
    <Container fluid>
      {filteredItems.map((message, index) => (
        <Row key={index}>
          <Col md={6}>{message.Timestamp}</Col>
          <Col md={3}>{message.Properties?.Key || "global"}</Col>
          <Col md={2}>{message.Level}</Col>
          <Col md={13}>{message.RenderedMessage}</Col>
        </Row>
      ))}
    </Container>
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
      >
        <Content filteredItems={filteredItems} />
      </ScrollToBottom>
      </>
  );
};

export default ConsoleWindow;

interface ConsoleWindowProps {
  filteredItems: Message[];
}
