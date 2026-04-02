import { skipToken } from '@reduxjs/toolkit/query';
import { Col, Container, Row } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
import { Version, useGetVersionsQuery } from "../store/apiSlice";

const Versions = () => {
  const { appId } = useAppParams();
  const { data: versions } = useGetVersionsQuery(appId ? { appId } : skipToken);

  if (!versions) {
    return <div>Loading...</div>;
  }

  const unsorted: Version[] = [];
  Object.assign(unsorted, versions)

  const sorted = unsorted.sort((a, b) => {
    if (a.Name < b.Name) {
      return -1;
    }
    if (a.Name > b.Name) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
    <h2 className='mb-2'>Loaded Assemblies and Versions</h2>

      <Container fluid className='bg-body sticky-top'>
        <Row className="fw-bold">
          <Col md={8}>Name</Col>
          <Col >Version</Col>
        </Row>
      </Container>
      <Container fluid>
        {sorted?.map((i) => (
          <Row key={i.Name}>
            <Col md={8}>{i.Name}</Col>
            <Col>{i.Version}</Col>
          </Row>
        ))}
      </Container>
    </div>
  );
};

export default Versions;
