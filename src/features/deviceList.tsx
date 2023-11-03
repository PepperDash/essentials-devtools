import { Col, Container, Row } from "react-bootstrap";
import { useGetDevicesQuery } from "../store/apiSlice";

const DeviceList = () => {
  const { data: devices } = useGetDevicesQuery();

  if (!devices) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Container fluid>
        <Row>
          <Col md={12}>
            {devices?.map(({ Name, Key }) => (
              <div className="d-flex" key={Key}>
                {Name}[{Key}]
              </div>
            ))}
          </Col>
          <Col md={9}></Col>
        </Row>
      </Container>
    </>
  );
};

export default DeviceList;
