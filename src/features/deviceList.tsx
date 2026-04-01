import { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { IKeyed, useGetDevicesQuery } from "../store/apiSlice";
import DeviceDetail from "./DeviceDetail";

const DeviceList = () => {
  const [selectedDevice, setSelectedDevice] = useState<IKeyed>();
  const { data: devices } = useGetDevicesQuery();

  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Container fluid className="h-100 overflow-none">
        <Row className="h-100 overflow-none">
          <Col md={8} className="h-100 overflow-none">
            <Row className="w-100 fw-bold">
              <Col md={12}>Key</Col>
              <Col md={12}>Name</Col>
            </Row>
            <div className="h-100 overflow-auto">
            {devices?.map((i) => (
              <Row
                key={i.Key}
                className={`w-100 cursor-pointer ${selectedDevice?.Key === i.Key ? "bg-secondary text-light" : ""}`}
                onClick={() => setSelectedDevice(i)}
              >
                <Col md={12}>{i.Key}</Col>
                <Col md={12}>{i.Name}</Col>
              </Row>
            ))}
            </div>
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
