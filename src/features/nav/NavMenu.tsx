import { Dropdown } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';
import { IconDarkChevronDown } from '../../shared/icons';
import NavIcon from './NavIcon';
import useNavLinks from './useNavLinks';

/**
 * Page navigation, sitting beside the app selector. The button names the current page; opening it
 * shows every page as a grouped panel. It stays one control at every width, so no link can be
 * pushed out of view by a narrow window.
 */
const NavMenu = () => {
  const { appId, groups } = useNavLinks();
  const { pathname } = useLocation();

  const current = groups
    .flatMap((g) => g.links)
    .find((l) => pathname.endsWith(`/${l.path}`));

  return (
    <Dropdown className="nav-menu-dropdown">
      <Dropdown.Toggle
        variant="light"
        id="nav-menu-toggle"
        className="top-nav-btn"
      >
        {current ? (
          <NavIcon name={current.icon} className="top-nav-btn-icon" />
        ) : null}
        <span className="nav-menu-current">{current?.title ?? 'Menu'}</span>
        <IconDarkChevronDown />
      </Dropdown.Toggle>
      <Dropdown.Menu className="nav-menu" popperConfig={{ strategy: 'fixed' }}>
        <div className="nav-menu-grid">
          {groups.map((group) => (
            <div key={group.name} className="nav-menu-group">
              <Dropdown.Header>{group.name}</Dropdown.Header>
              {group.links.map((link) =>
                appId ? (
                  <Dropdown.Item
                    key={link.path}
                    as={NavLink}
                    to={`/${appId}/${link.path}`}
                  >
                    <NavIcon name={link.icon} />
                    <span className="nav-menu-label">{link.label}</span>
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item key={link.path} disabled>
                    <NavIcon name={link.icon} />
                    <span className="nav-menu-label">{link.label}</span>
                  </Dropdown.Item>
                )
              )}
            </div>
          ))}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NavMenu;
