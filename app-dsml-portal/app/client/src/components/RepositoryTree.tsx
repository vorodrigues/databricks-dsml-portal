import { useMemo, useState, type ReactNode } from "react";
import type { RepositoryTree as Tree } from "../lib/api";
import { baseName, TreeItem } from "./TreeItem";

type Entry = Tree["entries"][number];

// Files of the repository `main` branch as a collapsible tree; each entry links to GitHub.
export function RepositoryTree({ tree }: { tree: Tree }) {
  const children = useMemo(() => {
    const byParent = new Map<string, Entry[]>();
    for (const e of tree.entries) {
      const parent = e.path.includes("/") ? e.path.slice(0, e.path.lastIndexOf("/")) : "";
      byParent.set(parent, [...(byParent.get(parent) ?? []), e]);
    }
    // Folders first, then files, alphabetically (as in GitHub).
    for (const list of byParent.values())
      list.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.path.localeCompare(b.path));
    return byParent;
  }, [tree]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (path: string) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const render = (parent: string, depth: number): ReactNode =>
    (children.get(parent) ?? []).map((e) => (
      <div key={e.path}>
        <TreeItem name={baseName(e.path)} depth={depth} isDir={e.isDir} expanded={open.has(e.path)} onClick={e.isDir ? () => toggle(e.path) : undefined}>
          {e.isDir ? (
            <span className="tree-item__label">{baseName(e.path)}</span>
          ) : (
            <a className="tree-item__label tree-item__link" href={e.url} target="_blank" rel="noreferrer" data-path={e.path}>
              {baseName(e.path)}
            </a>
          )}
          <a className="btn btn--ghost btn--sm tree-item__view" href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
            View
          </a>
        </TreeItem>
        {e.isDir && open.has(e.path) && render(e.path, depth + 1)}
      </div>
    ));

  if (!tree.entries.length) return <div className="card__empty">The main branch is empty.</div>;
  return (
    <div role="tree" className="tree">
      {render("", 0)}
      {tree.truncated && <div className="card__empty">The tree is truncated; open the repository to see all files.</div>}
    </div>
  );
}
