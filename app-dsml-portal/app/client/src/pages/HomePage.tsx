import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../shell/PageHeader";
import { IconWarning } from "../shell/icons";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useProjects } from "../lib/useProjects";
import { getJson, type Activity } from "../lib/api";
import { compareBy, ProjectsTable, type SortKey } from "../components/ProjectsTable";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { AlertGroup } from "../components/AlertGroup";

const RECENT = 10;
const RECENT_COLUMNS: SortKey[] = ["name", "creator", "modified", "pendingApprovals"];

// Overview: pending approval alerts, indicators, recent projects and commit activity.
export function HomePage() {
  useDocumentTitle("Home");
  const navigate = useNavigate();
  const { projects, error } = useProjects();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityError, setActivityError] = useState("");
  useEffect(() => {
    getJson<Activity>("/api/activity").then(setActivity).catch((e) => setActivityError(e.message));
  }, []);

  // One alert per project with open pull requests to main and one per model version pending approval.
  const alerts = (projects ?? []).flatMap((p) => [
    ...(p.pendingPulls > 0 ? [{ project: p.name, key: `${p.name}#pulls`, kind: "pulls" as const, count: p.pendingPulls }] : []),
    ...p.modelApprovals.map((m) => ({ project: p.name, key: `${p.name}@${m.version}`, kind: "model" as const, count: 1, model: m })),
  ]);
  const recent = [...(projects ?? [])].sort(compareBy("modified", "desc")).slice(0, RECENT);
  const count = (n: number | undefined) => (projects ? n : "-");

  return (
    <>
      <PageHeader title="Home" subtitle="Overview of your ML projects, pending approvals and recent activity." />
      {error && <div className="form-alert">{error}</div>}

      <AlertGroup
        names={alerts.map((a) => a.project)}
        alerts={alerts.map((a) => (
          <button
            key={a.key}
            className="alert alert--warning"
            data-project={a.project}
            data-alert={a.kind}
            onClick={() => navigate(`/projects/${encodeURIComponent(a.project)}`)}
          >
            <IconWarning className="alert__icon" />
            {a.kind === "pulls" ? (
              <span>
                <strong>{a.project}</strong> has {a.count} pending approval{a.count === 1 ? "" : "s"}
                {" "}(open pull request{a.count === 1 ? "" : "s"} to main).
              </span>
            ) : (
              <span>
                <strong>{a.project}</strong> has {a.count} pending model approval{a.count === 1 ? "" : "s"}
                {" "}({a.model.model} v{a.model.version}).
              </span>
            )}
            <span className="alert__action">Review</span>
          </button>
        ))}
      />

      <div className="toolbar">
        <div className="indicators">
          <div className="indicator" data-indicator="projects">
            <span className="indicator__label">Projects</span>
            <span className="indicator__value">{count(projects?.length)}</span>
          </div>
          <div className="indicator" data-indicator="pending-approvals">
            <span className="indicator__label">Pending approvals</span>
            <span className="indicator__value">{count(projects?.reduce((n, p) => n + p.pendingApprovals, 0))}</span>
          </div>
        </div>
        <Link className="btn btn--primary" to="/projects/new">
          Create
        </Link>
      </div>

      <div className="home-columns">
        <section className="home-columns__main">
          <h2 className="section-title">Recent projects</h2>
          {projects && <ProjectsTable projects={recent} columns={RECENT_COLUMNS} />}
        </section>
        <section className="home-columns__side">
          <h2 className="section-title">Activity</h2>
          {activityError && <div className="form-alert">{activityError}</div>}
          {activity && <ActivityHeatmap activity={activity} />}
        </section>
      </div>
    </>
  );
}
