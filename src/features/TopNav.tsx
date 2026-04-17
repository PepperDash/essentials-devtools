import { useMemo } from "react";
import { Dropdown, Nav, Navbar } from "react-bootstrap";
import { NavLink, useLocation } from "react-router-dom";
import { meetsMinVersion } from "../shared/functions/meetsMinimumVersion";
import useAppParams from "../shared/hooks/useAppParams";
import { IconDarkChevronDown, IconDarkEllipse } from "../shared/icons";
import { useGetVersionsQuery } from "../store/apiSlice";
import { selectAvailableApps } from "../store/auth/authSelectors";
import { useAppSelector } from "../store/hooks";

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
              location.pathname.includes(`/${params.appId}/apiPaths`)
                ? "text-secondary me-3"
                : "me-3"
            }
            to={`/${params.appId}/apiPaths`}
          >
            API Paths
          </NavLink>
          {showInitializationExceptions && (
            <NavLink
              className={
                location.pathname.includes(
                  `/${params.appId}/initializationExceptions`,
                )
                  ? "text-secondary me-3"
                  : "me-3"
              }
              to={`/${params.appId}/initializationExceptions`}
            >
              Initialization Exceptions
            </NavLink>
          )}
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
            Debug Console {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </Navbar>
  );
};

export default TopNav;
