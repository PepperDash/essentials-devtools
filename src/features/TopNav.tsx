import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState } from 'react';
import { Badge, Dropdown, Nav, Navbar } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';
import { meetsMinVersion } from '../shared/functions/meetsMinimumVersion';
import useAppParams from '../shared/hooks/useAppParams';
import {
  IconDarkChevronDown,
  IconDarkEllipse,
  IconDarkHelp,
} from '../shared/icons';
import {
  useGetPathsQuery,
  useGetPluginLoadIssuesQuery,
  useGetVersionsQuery,
} from '../store/apiSlice';
import { selectAvailableApps } from '../store/auth/authSelectors';
import { useAppSelector } from '../store/hooks';
import {
  badgeText,
  supportsPluginLoadIssuesApi,
} from '../store/pluginLoadIssuesContract';
import { supportsSecretsApi } from '../store/secretsContract';

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
    return (
      <span
        className="me-3 text-muted nav-link-disabled"
        role="link"
        aria-disabled="true"
        tabIndex={-1}
      >
        {children}
      </span>
    );
  }
  return (
    <NavLink
      className={({ isActive }) => (isActive ? 'me-3 text-secondary' : 'me-3')}
      to={`/${appId}/${path}`}
    >
      {children}
    </NavLink>
  );
};

const TopNav = ({ isConnected }: { isConnected: boolean }) => {
  const location = useLocation();
  const params = useAppParams();
  const availableApps = useAppSelector(selectAvailableApps);

  // Below the xl breakpoint the links fold behind a toggle. The links are router NavLinks rather
  // than Nav.Links, so collapseOnSelect doesn't close it. Close it on every navigation instead,
  // including Back to the page it was opened on, by resetting the state during render when the
  // path changes (React's alternative to an effect for this).
  const [menu, setMenu] = useState({
    expanded: false,
    path: location.pathname,
  });
  if (menu.path !== location.pathname) {
    setMenu({ expanded: false, path: location.pathname });
  }
  const expanded = menu.expanded && menu.path === location.pathname;
  const setExpanded = (open: boolean) =>
    setMenu({ expanded: open, path: location.pathname });

  const reactAppVersion = APP_VERSION;

  // Single version query for the currently active app only (used for feature flagging)
  const { data: currentVersions } = useGetVersionsQuery(
    params.appId ? { appId: params.appId } : { appId: '' },
    { skip: !params.appId }
  );

  const appIdOptions = availableApps;

  // Extract the current sub-route (e.g. "routing", "console") so we can
  // preserve it when switching apps. Falls back to "console" if not on an
  // app-scoped route yet.
  // App IDs are appNN on an appliance and the room ID on VC-4, so match on the known apps.
  const currentSubRoute = useMemo(() => {
    const match = location.pathname.match(/^\/([^/]+)\/(.+)/);
    return match && availableApps.includes(match[1]) ? match[2] : 'console';
  }, [location.pathname, availableApps]);

  // Detected from the processor's live route table rather than a version number, so the link
  // appears exactly where the endpoint exists. RTK Query dedupes this with the Routing page's
  // identical probe, so it costs no extra request.
  const { data: apiPaths } = useGetPathsQuery(
    params.appId ? { appId: params.appId } : skipToken
  );
  const showSecrets = useMemo(
    () => supportsSecretsApi(apiPaths?.routes),
    [apiPaths]
  );
  const showPluginLoadIssues = useMemo(
    () => supportsPluginLoadIssuesApi(apiPaths?.routes),
    [apiPaths]
  );

  // Drives the count badge. Shared with the Plugin Load Issues page through RTK Query's cache.
  const { data: pluginLoadIssues } = useGetPluginLoadIssuesQuery(
    params.appId && showPluginLoadIssues ? { appId: params.appId } : skipToken
  );

  const showInitializationExceptions = useMemo(() => {
    const essentialsVersion = currentVersions?.find(
      (v) => v.Name === 'PepperDashEssentials.dll'
    )?.Version;
    if (!essentialsVersion) return false;
    return meetsMinVersion(essentialsVersion, '3.0.0');
  }, [currentVersions]);

  const connectionStatus = (
    <IconDarkEllipse className={isConnected ? 'text-success' : 'text-danger'} />
  );
  const connectionText = `Debug Console ${isConnected ? 'Connected' : 'Disconnected'}`;

  return (
    <Navbar
      expand="xl"
      expanded={expanded}
      onToggle={setExpanded}
      variant="light"
      bg="white"
      className={`top-nav user-select-none shadow-sm px-0${expanded ? ' top-nav-open' : ''}`}
    >
      <div className="w-100 px-2 d-flex flex-wrap flex-xl-nowrap align-items-center gap-2">
        {/* Below xl this row stays put while the open menu scrolls under it */}
        <div className="top-nav-header d-flex align-items-center gap-2 flex-grow-1 flex-xl-grow-0">
          <Navbar.Brand className="me-0">
            <span className="d-none d-sm-inline">Essentials </span>Dev Tools
          </Navbar.Brand>
          {/* display a message indicating that there are no loaded applications if the appIdOptions array is empty, otherwise display the dropdown */}
          {appIdOptions.length === 0 ? (
            <span>No Loaded Applications</span>
          ) : (
            <Dropdown>
              <Dropdown.Toggle variant="link" id="dropdown-basic">
                {/* display the currently selected appId or "Select Application" if no appId is selected */}
                {/* if no appIdOptions are available, display "No Loaded Applications" */}
                {params.appId || 'Select Application'}
                <IconDarkChevronDown />
              </Dropdown.Toggle>
              {/* Fixed positioning keeps the list from being clipped when the nav scrolls */}
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>
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
          {/* Collapsed: keep the connection light in view beside the toggle */}
          <span
            className="ms-auto d-xl-none"
            title={connectionText}
            aria-label={connectionText}
            role="img"
          >
            {connectionStatus}
          </span>
          {/* React-Bootstrap's toggle doesn't report its state to screen readers */}
          <Navbar.Toggle
            aria-controls="top-nav-links"
            aria-expanded={expanded}
          />
        </div>
        <Navbar.Collapse id="top-nav-links">
          <Nav className="me-auto top-nav-links">
            <AppNavLink appId={params.appId} path="versions">
              Versions
            </AppNavLink>
            <AppNavLink appId={params.appId} path="apiPaths">
              API Paths
            </AppNavLink>
            {showInitializationExceptions && (
              <AppNavLink appId={params.appId} path="initializationExceptions">
                Initialization Exceptions
              </AppNavLink>
            )}
            {showPluginLoadIssues && (
              <AppNavLink appId={params.appId} path="pluginLoadIssues">
                Plugin Issues
                {pluginLoadIssues && pluginLoadIssues.IssueCount > 0 && (
                  <Badge
                    pill
                    bg={pluginLoadIssues.ErrorCount > 0 ? 'danger' : 'warning'}
                    text={badgeText(
                      pluginLoadIssues.ErrorCount > 0 ? 'danger' : 'warning'
                    )}
                    className="ms-1"
                    title={`${pluginLoadIssues.IssueCount} plugin load issue(s)`}
                  >
                    {pluginLoadIssues.IssueCount}
                  </Badge>
                )}
              </AppNavLink>
            )}
            <AppNavLink appId={params.appId} path="console">
              Debug Console
            </AppNavLink>
            <AppNavLink appId={params.appId} path="config">
              Config File
            </AppNavLink>
            <AppNavLink appId={params.appId} path="devices">
              Devices
            </AppNavLink>
            <AppNavLink appId={params.appId} path="types">
              Types
            </AppNavLink>
            <AppNavLink appId={params.appId} path="routing">
              Routing
            </AppNavLink>
            <AppNavLink appId={params.appId} path="mobileControl">
              Mobile Control
            </AppNavLink>
            {showSecrets && (
              <AppNavLink appId={params.appId} path="secrets">
                Secrets
              </AppNavLink>
            )}
            <NavLink
              className={({ isActive }) =>
                isActive ? 'me-3 text-secondary' : 'me-3'
              }
              to="/help"
            >
              <IconDarkHelp className="me-1" />
              Help
            </NavLink>
          </Nav>
          <div className="d-flex flex-column align-items-xl-end py-2 py-xl-0">
            <span>Version: {reactAppVersion}</span>

            <div className="d-flex align-items-center">
              {connectionStatus}
              <span className="ms-2">{connectionText}</span>
            </div>
          </div>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
};

export default TopNav;
