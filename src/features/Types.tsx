import { Col, Container, Row } from "react-bootstrap";
import { Type, useGetTypesQuery } from "../store/apiSlice";

const Types = () => {
  const { data: types } = useGetTypesQuery();

  if (!types) {
    return <div>Loading...</div>;
  }

  const unsorted: Type[] = [];
  Object.assign(unsorted, types);

  const sorted = unsorted.sort((a, b) => {
    if (a.Type < b.Type) {
      return -1;
    }
    if (a.Type > b.Type) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className="mb-2">
        The Type Names Supported by the Currently Loaded Plugins
      </h2>
      <div className='flex-grow-1 overflow-auto'>
        <Container fluid className='bg-body sticky-top'>
          <Row className="fw-bold">
            <Col md={4}>Type Name</Col>
            <Col md={10}>Class Type</Col>
            <Col md={10}>Description</Col>
          </Row>
        </Container>
        <Container fluid>
          {sorted?.map((i) => (
            <Row key={i.Type}>
              <Col md={4}>{i.Type}</Col>
              <Col md={10}>{i.CType}</Col>
              <Col md={10}>{i.Description}</Col>
            </Row>
          ))}
        </Container>
      </div>
    </div>
  );
};

export default Types;
