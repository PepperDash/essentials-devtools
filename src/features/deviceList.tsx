import { useState } from 'react';
import { Col, Container, Row } from "react-bootstrap";
import { IKeyed, useGetDevicesQuery } from "../store/apiSlice";
import DeviceDetail from './DeviceDetail';

const DeviceList = () => {
  const [ selectedDevice, setSelectedDevice] = useState<IKeyed>();
  const { data: devices } = useGetDevicesQuery();


  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Container fluid>
        <Row>
          <Col md={8}>
            <Row className='w-100 fw-bold'>
                <Col md={12}>Key</Col>
                <Col md={12}>Name</Col>
            </Row>
            {devices?.map((i) => (
              <Row key={i.Key} className='w-100' onClick={() => setSelectedDevice(i)}>
                <Col md={12} >{i.Key}</Col>
                <Col md={12}>{i.Name}</Col>
              </Row>
            ))}
          </Col>
          <Col md={16}>
              <DeviceDetail item={selectedDevice} />
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default DeviceList;
