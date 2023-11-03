import { Container, Nav, Navbar } from "react-bootstrap";
import { NavLink, useLocation } from 'react-router-dom';

const TopNav = () => {
  const location = useLocation();



  return (
    <Navbar expand="md" variant="light" bg="white" className="user-select-none shadow-sm px-0">
      <Container fluid>
        <Navbar.Brand>Essentials Debugger</Navbar.Brand>
        <Nav className="me-auto">
            <NavLink className={ location.pathname.includes("/home") ? 'text-secondary me-3' : 'me-3'  } to="/home">Home</NavLink>
            <NavLink className={ location.pathname.includes("/console") ? 'text-secondary me-3' : 'me-3'} to="/console">Debug Console</NavLink>
            <NavLink className={ location.pathname.includes("/versions") ? 'text-secondary me-3' : 'me-3'  } to="/versions">Versions</NavLink>
            <NavLink className={ location.pathname.includes("/devices") ? 'text-secondary me-3' : 'me-3'  } to="/devices">Devices</NavLink>
            <NavLink className={ location.pathname.includes("/types") ? 'text-secondary me-3' : 'me-3'  } to="/types">Types</NavLink>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default TopNav;
