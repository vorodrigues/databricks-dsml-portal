// Main menu entries and document title convention.
import type { ComponentType, SVGProps } from "react";
import { IconHome, IconProjects } from "../shell/icons";

export type MenuItem = {
  name: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Only Home and Projects appear in the menu; Create new project and Details are reached from them
// (Projects stays active on them).
export const MENU: MenuItem[] = [
  { name: "Home", path: "/", icon: IconHome },
  { name: "Projects", path: "/projects", icon: IconProjects },
];

export const DOC_TITLE_SUFFIX = "DSML Portal";
