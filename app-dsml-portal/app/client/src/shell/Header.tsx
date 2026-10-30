import { useEffect, useState, type CSSProperties } from "react";
import { DatabricksGlyph, DatabricksWordmark, IconSidebarToggle } from "./icons";
import { getJson, type Me } from "../lib/api";

type HeaderProps = {
  onToggleSidebar: () => void;
  collapsed: boolean;
};

// Global top bar: menu toggle, Databricks logo, portal name and the signed-in user.
export function Header({ onToggleSidebar, collapsed }: HeaderProps) {
  const [user, setUser] = useState<string>("");
  useEffect(() => {
    getJson<Me>("/api/me")
      .then((me) => setUser(me.user.userName))
      .catch(() => setUser(""));
  }, []);
  // Inner bar of the toggle icon follows the menu state (as in the workspace).
  const toggleIconStyle = {
    "--sidebar-icon-transform": collapsed
      ? "translateX(0) scaleY(1)"
      : "translateX(1.5px) scaleY(1.467)",
  } as CSSProperties;
  return (
    <header className="header">
      <button
        className="header__icon-btn"
        style={toggleIconStyle}
        onClick={onToggleSidebar}
        aria-label="Toggle side menu"
        aria-expanded={!collapsed}
      >
        <IconSidebarToggle />
      </button>
      <span className="header__logo">
        <DatabricksGlyph />
        <DatabricksWordmark />
      </span>
      <span className="header__product">DSML Portal</span>
      <div className="header__spacer" />
      {user && <span className="header__workspace">{user}</span>}
    </header>
  );
}
