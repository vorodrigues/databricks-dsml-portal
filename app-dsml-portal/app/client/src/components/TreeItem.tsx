import type { ReactNode } from "react";
import { IconChevronDown, IconChevronRight, IconFile, IconFileCode, IconFolder } from "../shell/icons";

const CODE_EXT = /\.(ya?ml|json|py|sh|sql|toml|cfg|ini|js|ts|tsx)$|^MLmodel$/i;

// One row of a file tree (MLflow artifacts tree style): indent, expander, icon and label.
export function TreeItem({
  name,
  depth,
  isDir,
  expanded,
  selected,
  onClick,
  children,
}: {
  name: string;
  depth: number;
  isDir: boolean;
  expanded?: boolean;
  selected?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const Icon = isDir ? IconFolder : CODE_EXT.test(name) ? IconFileCode : IconFile;
  return (
    <div
      className={`tree-item${selected ? " tree-item--selected" : ""}`}
      style={{ paddingLeft: 8 + depth * 24 }}
      role="treeitem"
      aria-expanded={isDir ? !!expanded : undefined}
      aria-selected={selected}
      onClick={onClick}
    >
      <span className="tree-item__switcher">{isDir && (expanded ? <IconChevronDown /> : <IconChevronRight />)}</span>
      <Icon className="tree-item__icon" />
      {children ?? <span className="tree-item__label">{name}</span>}
    </div>
  );
}

export const baseName = (path: string) => path.split("/").pop() || path;

export function formatBytes(size: number | null) {
  if (size == null) return "";
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
