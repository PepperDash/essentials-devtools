import { useMemo } from "react";
import { Dropdown, Nav, Navbar } from "react-bootstrap";
import { NavLink, useLocation } from "react-router-dom";
import { meetsMinVersion } from "../shared/functions/meetsMinimumVersion";
import useAppParams from "../shared/hooks/useAppParams";
import { IconDarkChevronDown, IconDarkEllipse } from "../shared/icons";
import { useGetVersionsQuery } from "../store/apiSlice";
import { selectAvailableApps } from "../store/auth/authSelectors";
import { useAppSelector } from "../store/hooks";

const AppNavLink = ({
  appId,
  path,
  children,
}: {
  appId: string | undefined;
  path: string;
  children: React.ReactNode;
}) => {
  if (!appId) {
    return <span className="me-3 text-muted nav-link-disabled">{children}</span>;
  }
  return (
    <NavLink className="me-3" to={`/${appId}/${path}`}>
      {children}
    </NavLink>
  );
};

const TopNav = ({ isConnected }: { isConnected: boolean }) => {
  const location = useLocation();
  const params = useAppParams();
  const availableApps = useAppSelector(selectAvailableApps);

  // Single version query for the currently active app only (used for feature flagging)
  const { data: currentVersions } = useGetVersionsQuery(
    params.appId ? { appId: params.appId } : { appId: '' },
    { skip: !params.appId }
  );

  const appIdOptions = availableApps;

  // Extract the current sub-route (e.g. "routing", "console") so we can
  // preserve it when switching apps. Falls back to "console" if not on an
  // app-scoped route yet.
  const currentSubRoute = useMemo(() => {
    const match = location.pathname.match(/^\/app\d+\/(.+)/);
    return match ? match[1] : "console";
  }, [location.pathname]);

  const showInitializationExceptions = useMemo(() => {
    const essentialsVersion = currentVersions?.find(
      (v) => v.Name === "PepperDashEssentials.dll",
    )?.Version;
    if (!essentialsVersion) return false;
    return meetsMinVersion(essentialsVersion, "3.0.0");
  }, [currentVersions]);

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
              {appIdOptions.map((id: string) => (
                <Dropdown.Item
                  key={id}
                  as={NavLink}
                  to={`/${id}/${currentSubRoute}`}
                >
                  {id}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
        <Nav className="me-auto">
          <AppNavLink appId={params.appId} path="versions">Versions</AppNavLink>
          <AppNavLink appId={params.appId} path="apiPaths">API Paths</AppNavLink>
          {showInitializationExceptions && (
            <AppNavLink appId={params.appId} path="initializationExceptions">
              Initialization Exceptions
            </AppNavLink>
          )}
          <AppNavLink appId={params.appId} path="console">Debug Console</AppNavLink>
          <AppNavLink appId={params.appId} path="config">Config File</AppNavLink>
          <AppNavLink appId={params.appId} path="devices">Devices</AppNavLink>
          <AppNavLink appId={params.appId} path="types">Types</AppNavLink>
          <AppNavLink appId={params.appId} path="routing">Routing</AppNavLink>
          <AppNavLink appId={params.appId} path="mobileControl">Mobile Control</AppNavLink>
        </Nav>
        <div className="d-flex align-items-center">
          <IconDarkEllipse
            className={isConnected ? "text-success" : "text-danger"}
          />
          <span className="ms-2">
            Debug Console {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </Navbar>
  );
};

export default TopNav;
