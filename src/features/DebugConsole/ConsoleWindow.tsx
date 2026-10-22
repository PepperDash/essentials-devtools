import { useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import ScrollToBottom from 'react-scroll-to-bottom';
import { LogMessage } from '../../shared/types/LogMessage';
import LogMessageDetailDrawer from './LogMessageDetailDrawer';

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
      <Container fluid className="table-striped">
        {filteredItems.map((message, index) => (
          <Row
            key={index}
            onClick={() => clickItem(message)}
            className={
              'cursor-pointer hover ' +
              (selectedItem === message
                ? 'bg-primary text-white'
                : index % 2 === 0
                  ? 'bg-light'
                  : 'bg-white')
            }
          >
            {/* On a phone: timestamp, key and level on one line, the message on the next */}
            <Col xs={11} md={6} className="text-truncate small-sm">
              {message.Timestamp}
            </Col>
            <Col xs={8} md={3} className="text-truncate small-sm">
              {message.Properties?.Key || 'global'}
            </Col>
            <Col xs={5} md={2} className="text-truncate small-sm">
              {message.Level}
            </Col>
            <Col xs={24} md={13} className="text-nowrap text-truncate">
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
        <Row className="fw-bold d-none d-md-flex">
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
        initialScrollBehavior="auto"
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
