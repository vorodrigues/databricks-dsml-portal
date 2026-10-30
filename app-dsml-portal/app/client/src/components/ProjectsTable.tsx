import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Project } from "../lib/api";
import {
  IconChevronLeft,
  IconChevronRight,
  IconNewWindow,
  IconSortDown,
  IconSortUp,
  IconUser,
  IconWarning,
} from "../shell/icons";

// Projects table in the workspace Compute list pattern: sortable headers (default Modified desc),
// clickable rows (-> Details) and optional pagination.

export type SortKey = "name" | "template" | "repo" | "creator" | "createdAt" | "modified" | "pendingApprovals" | "status";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "template", label: "Template" },
  { key: "repo", label: "Repository" },
  { key: "creator", label: "Creator" },
  { key: "createdAt", label: "Created" },
  { key: "modified", label: "Modified" },
  { key: "pendingApprovals", label: "Pending approvals" },
  { key: "status", label: "Status" },
];

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "-";

// Comparator with empty values (e.g. Modified of a project without repository) always last.
export function compareBy(key: SortKey, dir: "asc" | "desc") {
  return (a: Project, b: Project) => {
    const x = a[key];
    const y = b[key];
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    const c = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y));
    return dir === "asc" ? c : -c;
  };
}

export function ProjectsTable({
  projects,
  pageSize,
  columns: only,
}: {
  projects: Project[];
  pageSize?: number;
  // Subset of the columns to show (all by default).
  columns?: SortKey[];
}) {
  const navigate = useNavigate();
  const columns = only ? COLUMNS.filter((c) => only.includes(c.key)) : COLUMNS;
  const show = (key: SortKey) => columns.some((c) => c.key === key);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "modified", dir: "desc" });
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [projects]);

  const sorted = useMemo(() => [...projects].sort(compareBy(sort.key, sort.dir)), [projects, sort]);
  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const rows = pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
              >
                <span className="table__th">
                  {c.label}
                  {sort.key === c.key && (sort.dir === "asc" ? <IconSortUp /> : <IconSortDown />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.name}
              className={`table__row${p.pendingApprovals ? " table__row--pending" : ""}`}
              data-project={p.name}
              onClick={() => navigate(`/projects/${encodeURIComponent(p.name)}`)}
            >
              <td>
                <Link className="table__link" to={`/projects/${encodeURIComponent(p.name)}`} onClick={stop}>
                  {p.name}
                </Link>
              </td>
              {show("template") && <td>{p.template}</td>}
              {show("repo") && (
                <td>
                  <a className="table__link table__repo" href={p.repoUrl} target="_blank" rel="noreferrer" onClick={stop}>
                    {p.repo}
                    <IconNewWindow />
                  </a>
                </td>
              )}
              {show("creator") && (
                <td>
                  <span className="table__user">
                    <IconUser />
                    {p.creator}
                  </span>
                </td>
              )}
              {show("createdAt") && <td className="table__date">{formatDate(p.createdAt)}</td>}
              {show("modified") && <td className="table__date">{formatDate(p.modified)}</td>}
              {show("pendingApprovals") && (
                <td>
                  {p.pendingApprovals > 0 ? (
                    <span
                      className="pending"
                      title={`${p.pendingPulls} open pull request(s) to main\n${p.modelApprovals.length} model version(s) pending approval`}
                    >
                      <IconWarning />
                      {p.pendingApprovals}
                    </span>
                  ) : (
                    <span className="table__muted">0</span>
                  )}
                </td>
              )}
              {show("status") && (
                <td>
                  <span className={`status status--${p.status}`}>{p.status}</span>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="table__empty" colSpan={columns.length}>
                No projects found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pageSize && (
        <ul className="pagination" aria-label="Pagination">
          <li>
            <button className="pagination__item" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
              <IconChevronLeft />
            </button>
          </li>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              <button
                className={`pagination__item${n === page ? " pagination__item--active" : ""}`}
                aria-current={n === page ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            </li>
          ))}
          <li>
            <button className="pagination__item" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page">
              <IconChevronRight />
            </button>
          </li>
        </ul>
      )}
    </>
  );
}
