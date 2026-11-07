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
      <Container fluid className="console-log">
        {filteredItems.map((message, index) => (
          <Row
            key={index}
            onClick={() => clickItem(message)}
            className={
              'cursor-pointer hover ' +
              (selectedItem === message
                ? 'bg-primary text-white'
                : index % 2 === 0
                  ? 'console-row-alt'
                  : 'console-row')
            }
          >
            {/* On a phone: timestamp, key and level on one line, the message on the next */}
            <Col xs={11} md={5} className="text-truncate small-sm">
              {message.Timestamp}
            </Col>
            <Col xs={8} md={4} className="text-truncate small-sm">
              {message.Properties?.Key || 'global'}
            </Col>
            <Col
              xs={5}
              md={3}
              className={`text-truncate small-sm log-level log-level-${(message.Level ?? '').toLowerCase()}`}
            >
              {message.Level}
            </Col>
            <Col xs={24} md={12} className="text-nowrap text-truncate">
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
        <Row className="console-header d-none d-md-flex">
          <Col md={5}>Timestamp</Col>
          <Col md={4}>Key</Col>
          <Col md={3}>Level</Col>
          <Col md={12}>Message</Col>
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
