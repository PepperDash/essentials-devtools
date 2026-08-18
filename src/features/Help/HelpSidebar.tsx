import { NavLink } from "react-router-dom";
import { docsNavTree } from "./docsContent";

const HelpSidebar = () => {
  return (
    <nav className="left-nav-width flex-shrink-0 overflow-auto pe-2 border-end">
      <NavLink
        to="/help"
        end
        className={({ isActive }) =>
          `d-block mb-2 ${isActive ? "text-secondary" : ""}`
        }
      >
        Documentation Home
      </NavLink>
      {docsNavTree.map((category) => (
        <div key={category.category} className="mb-3">
          <NavLink
            to={`/help/${category.indexSlug}`}
            end
            className={({ isActive }) =>
              `d-block fw-semibold ${isActive ? "text-secondary" : ""}`
            }
          >
            {category.label}
          </NavLink>
          <ul className="list-unstyled ps-3 mb-0">
            {category.pages.map((page) => (
              <li key={page.slug}>
                <NavLink
                  to={`/help/${page.slug}`}
                  className={({ isActive }) =>
                    isActive ? "text-secondary" : ""
                  }
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default HelpSidebar;
