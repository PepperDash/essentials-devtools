import { Offcanvas } from "react-bootstrap";
import { Route } from "../store/apiSlice";

const ApiPathDetailDrawer = ({
  show,
  route,
  handleClose,
  url,
}: ApiPathDetailDrawerProps) => {
  if (!route) return null;

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      backdrop={false}
      className="right-drawer shadow-sm border p-3"
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>API Path Detail</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div className="d-flex flex-column gap-3">
          <div>
            <h5>Name</h5>
            {route.Name}
          </div>
          <div>
            <h5>URL</h5>
            <a href={`${url}/${route.Url}`} target="_blank" rel="noopener noreferrer">
              {`${url}/${route.Url}`}
            </a>
          </div>
          {route.DataTokens?.Name && (
            <div>
              <h5>Data Token Name</h5>
              {route.DataTokens.Name}
            </div>
          )}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default ApiPathDetailDrawer;

interface ApiPathDetailDrawerProps {
  show: boolean;
  route: Route | undefined;
  handleClose: () => void;
  url: string;
}
