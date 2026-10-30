import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

// Shell: global header on top + collapsible menu on the left + content panel.
// The collapsed state lives here and is toggled by the header button.
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="shell">
      <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="body">
        <Sidebar collapsed={collapsed} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
