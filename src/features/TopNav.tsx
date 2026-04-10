import { useMemo } from "react";
import { Dropdown, Nav, Navbar } from "react-bootstrap";
import { NavLink, useLocation } from "react-router-dom";
import useAppParams from "../shared/hooks/useAppParams";
import { IconDarkChevronDown, IconDarkEllipse } from "../shared/icons";
import { useGetVersionsQuery } from "../store/apiSlice";

const TopNav = ({ isConnected }: { isConnected: boolean }) => {
  const location = useLocation();
  const params = useAppParams();

  // make a call to get the version for each appId and for every valid response add the appId to the dropdown options
  // this will ensure that only appIds with a running instance will be shown in the dropdown
  const { data: app01versions } = useGetVersionsQuery({ appId: "app01" });
  const { data: app02versions } = useGetVersionsQuery({ appId: "app02" });
  const { data: app03versions } = useGetVersionsQuery({ appId: "app03" });
  const { data: app04versions } = useGetVersionsQuery({ appId: "app04" });
  const { data: app05versions } = useGetVersionsQuery({ appId: "app05" });
  const { data: app06versions } = useGetVersionsQuery({ appId: "app06" });
  const { data: app07versions } = useGetVersionsQuery({ appId: "app07" });
  const { data: app08versions } = useGetVersionsQuery({ appId: "app08" });
  const { data: app09versions } = useGetVersionsQuery({ appId: "app09" });
  const { data: app10versions } = useGetVersionsQuery({ appId: "app10" });

  const appIdOptions = useMemo(() => {
    const options: appIds[] = [];
    if (app01versions) options.push("app01");
    if (app02versions) options.push("app02");
    if (app03versions) options.push("app03");
    if (app04versions) options.push("app04");
    if (app05versions) options.push("app05");
    if (app06versions) options.push("app06");
    if (app07versions) options.push("app07");
    if (app08versions) options.push("app08");
    if (app09versions) options.push("app09");
    if (app10versions) options.push("app10");
    return options;
  }, [
    app01versions,
    app02versions,
    app03versions,
    app04versions,
    app05versions,
    app06versions,
    app07versions,
    app08versions,
    app09versions,
    app10versions,
  ]);

  return (
    <Navbar
      expand="md"
      variant="light"
      bg="white"
      className="user-select-none shadow-sm px-0"
    >
      <div className="w-100 px-2 d-flex align-items-center gap-2">
        <Navbar.Brand>Essentials Dev Tools</Navbar.Brand>
        {/* display a message indicating that there are no loaded applications if the appIdOptions array is empty, otherwise display the dropdown */}
        {appIdOptions.length === 0 ? (
          <span>No Loaded Applications</span>
        ) : (
          <Dropdown>
            <Dropdown.Toggle variant="link" id="dropdown-basic">
              {/* display the currently selected appId or "Select Application" if no appId is selected */}
              {/* if no appIdOptions are available, display "No Loaded Applications" */}
              {params.appId || "Select Application"}
              <IconDarkChevronDown />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {appIdOptions.map((id) => (
                <Dropdown.Item key={id} as={NavLink} to={`/${id}/console`}>
                  {id}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
        <Nav className="me-auto">
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/versions`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/versions`}
          >
            Versions
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/console`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/console`}
          >
            Debug Console
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/config`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/config`}
          >
            Config File
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/devices`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/devices`}
          >
            Devices
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/types`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/types`}
          >
            Types
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/routing`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/routing`}
          >
            Routing
          </NavLink>
          <NavLink
            className={
              location.pathname.includes(`/${params.appId}/mobileControl`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/mobileControl`}
          >
            Mobile Control
          </NavLink>
        </Nav>
        <div className="d-flex align-items-center">
          <IconDarkEllipse
            className={isConnected ? "text-success" : "text-danger"}
          />
          <span className="ms-2">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </Navbar>
  );
};

export default TopNav;

type appIds =
  | "app01"
  | "app02"
  | "app03"
  | "app04"
  | "app05"
  | "app06"
  | "app07"
  | "app08"
  | "app09"
  | "app10";
