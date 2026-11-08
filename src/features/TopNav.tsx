import { useLayoutEffect, useMemo, useRef } from 'react';
import { Dropdown, Navbar } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';
import useAppParams from '../shared/hooks/useAppParams';
import ThemeToggle from '../shared/components/ThemeToggle';
import {
  IconDarkChevronDown,
  IconDarkEllipse,
  IconDarkHelp,
} from '../shared/icons';
import { selectAvailableApps } from '../store/auth/authSelectors';
import { useAppSelector } from '../store/hooks';
import NavMenu from './nav/NavMenu';

const AppIcon = ({ className }: { className: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </svg>
);

const TopNav = ({ isConnected }: { isConnected: boolean }) => {
  const location = useLocation();
  const params = useAppParams();
  const navRef = useRef<HTMLElement>(null);
  const availableApps = useAppSelector(selectAvailableApps);

  // The nav's height changes when its contents wrap onto more rows in a narrow window. Publish it
  // as --top-nav-height so the right drawer always sits directly beneath it.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const publish = () =>
      document.documentElement.style.setProperty(
        '--top-nav-height',
        `${nav.offsetHeight}px`
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--top-nav-height');
    };
  }, []);

  const reactAppVersion = APP_VERSION;
  const appIdOptions = availableApps;

  // Extract the current sub-route (e.g. "routing", "console") so we can
  // preserve it when switching apps. Falls back to "console" if not on an
  // app-scoped route yet.
  // App IDs are appNN on an appliance and the room ID on VC-4, so match on the known apps.
  const currentSubRoute = useMemo(() => {
    const match = location.pathname.match(/^\/([^/]+)\/(.+)/);
    return match && availableApps.includes(match[1]) ? match[2] : 'console';
  }, [location.pathname, availableApps]);

  const connectionStatus = (
    <IconDarkEllipse className={isConnected ? 'text-success' : 'text-danger'} />
  );
  const connectionText = `Debug Console ${isConnected ? 'Connected' : 'Disconnected'}`;

  return (
    <Navbar ref={navRef} className="top-nav user-select-none shadow-sm px-0 flex-shrink-0">
      <div className="w-100 px-2 d-flex flex-wrap align-items-center gap-2">
        <Navbar.Brand className="me-0">
          <img
            src={`${import.meta.env.BASE_URL}essentials-icon.svg`}
            alt=""
            className="top-nav-logo"
          />
          <span>
            <span className="d-none d-sm-inline">Essentials </span>Dev Tools
          </span>
        </Navbar.Brand>
        {/* display a message indicating that there are no loaded applications if the appIdOptions array is empty, otherwise display the dropdown */}
        {appIdOptions.length === 0 ? (
          <span>No Loaded Applications</span>
        ) : (
          <Dropdown>
            <Dropdown.Toggle
              variant="light"
              id="dropdown-basic"
              className="top-nav-btn"
            >
              <AppIcon className="top-nav-btn-icon" />
              {/* display the currently selected appId or "Select Application" if no appId is selected */}
              {params.appId || 'Select Application'}
              <IconDarkChevronDown />
            </Dropdown.Toggle>
            {/* Fixed positioning keeps the list from being clipped */}
            <Dropdown.Menu
              className="nav-menu app-menu"
              popperConfig={{ strategy: 'fixed' }}
            >
              <Dropdown.Header>Applications</Dropdown.Header>
              {appIdOptions.map((id: string) => (
                <Dropdown.Item
                  key={id}
                  as={NavLink}
                  to={`/${id}/${currentSubRoute}`}
                >
                  <AppIcon className="side-nav-icon" />
                  <span className="nav-menu-label">{id}</span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}

        <NavMenu />

        {/* Always in view, however narrow the window */}
        <div className="top-nav-right d-flex align-items-center gap-2 ms-auto">
          <div className="top-nav-status d-flex flex-column align-items-end">
            <span>Version: {reactAppVersion}</span>
            <span
              className="d-flex align-items-center"
              title={connectionText}
              role="status"
            >
              {connectionStatus}
              <span className="ms-1 d-none d-sm-inline">{connectionText}</span>
              <span className="visually-hidden d-sm-none">
                {connectionText}
              </span>
            </span>
          </div>
          <NavLink
            className={({ isActive }) =>
              `top-nav-help${isActive ? ' active text-secondary' : ''}`
            }
            to="/help"
            title="Help"
          >
            <IconDarkHelp />
            <span className="d-none d-sm-inline ms-1">Help</span>
          </NavLink>
          <ThemeToggle />
        </div>
      </div>
    </Navbar>
  );
};

export default TopNav;
