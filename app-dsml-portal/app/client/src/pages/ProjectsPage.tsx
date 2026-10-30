import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../shell/PageHeader";
import { IconSearch } from "../shell/icons";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useProjects } from "../lib/useProjects";
import { ProjectsTable } from "../components/ProjectsTable";
import { Toast } from "../components/Toast";

const PAGE_SIZE = 20;

// List of ML projects in the portal catalog, filtered by name and creator.
export function ProjectsPage() {
  useDocumentTitle("Projects");
  const { projects, error } = useProjects();
  const [filter, setFilter] = useState("");
  const [creator, setCreator] = useState("");
  // Notification passed by the page that navigated here (e.g. after deleting a project).
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string>((location.state as { toast?: string } | null)?.toast ?? "");
  const closeToast = useCallback(() => setToast(""), []);
  // Clears the state so that a reload does not show the notification again.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const creators = useMemo(() => [...new Set((projects ?? []).map((p) => p.creator))].sort(), [projects]);
  const visible = useMemo(
    () =>
      (projects ?? []).filter(
        (p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()) && (!creator || p.creator === creator)
      ),
    [projects, filter, creator]
  );

  return (
    <>
      {toast && <Toast message={toast} onClose={closeToast} />}
      <PageHeader title="Projects" subtitle="ML projects created from project templates." />
      <div className="toolbar toolbar--filters">
        <div className="filters">
          <label className="filter-input">
            <IconSearch className="filter-input__icon" />
            <input
              id="project-filter"
              placeholder="Filter projects"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter projects by name"
            />
          </label>
          <select
            id="creator-filter"
            className="input select filter-select"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            aria-label="Filter projects by creator"
          >
            <option value="">Creator</option>
            {creators.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Link className="btn btn--primary" to="/projects/new">
          Create
        </Link>
      </div>
      {error && <div className="form-alert">{error}</div>}
      {projects && <ProjectsTable projects={visible} pageSize={PAGE_SIZE} />}
    </>
  );
}
