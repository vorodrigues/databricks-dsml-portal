import { NavLink } from "react-router-dom";
import { MENU } from "../lib/pages";

type SidebarProps = {
  collapsed: boolean;
};

// Collapsible main menu on the left (workspace pattern).
// Collapsed: icons only; expanded: icon + label.
export function Sidebar({ collapsed }: SidebarProps) {
  return (
    <nav className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`} aria-label="Main menu">
      <div className="sidebar__nav">
        {MENU.map((page) => {
          const Icon = page.icon;
          return (
            <NavLink
              key={page.path}
              to={page.path}
              end={page.path === "/"}
              className={({ isActive }) =>
                `nav-item${isActive ? " nav-item--active" : ""}`
              }
              title={collapsed ? page.name : undefined}
            >
              <span className="nav-item__icon">
                <Icon />
              </span>
              <span className="nav-item__label">{page.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
