import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../shell/PageHeader";
import { IconInfo, IconWarning } from "../shell/icons";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { getJson, postJson, type ModelApproval, type ProdModel, type ProjectDetails, type PullRequest, type RepositoryTree } from "../lib/api";
import { NoProdModel, ProjectDetailsCard, RunOverview } from "../components/RunOverview";
import { ArtifactsBrowser } from "../components/ArtifactsBrowser";
import { ProjectMenu } from "../components/ProjectMenu";
import { AlertGroup } from "../components/AlertGroup";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "artifacts", label: "Model Artifacts" },
] as const;

const POLL_MS = 3000;

// Pending approval: an open pull request to main, approved (merge) or rejected (close) here.
function ApprovalAlert({ project, pull, onDone }: { project: string; pull: PullRequest; onDone: () => void }) {
  const [busy, setBusy] = useState<"" | "approve" | "reject">("");
  const [error, setError] = useState("");
  const act = async (action: "approve" | "reject") => {
    setBusy(action);
    setError("");
    const { status, data } = await postJson<{ error?: string }>(
      `/api/projects/${encodeURIComponent(project)}/pulls/${pull.number}/${action}`,
      {}
    );
    setBusy("");
    if (status >= 400) setError(data.error || `HTTP ${status}`);
    else onDone();
  };
  return (
    <div className="alert alert--static" data-pull={pull.number}>
      <IconWarning className="alert__icon" />
      <span className="alert__text">
        Pending approval:{" "}
        <a className="link" href={pull.url} target="_blank" rel="noreferrer">
          #{pull.number} {pull.title}
        </a>{" "}
        <span className="table__muted">
          ({pull.head} → main, by {pull.author})
        </span>
        {error && <span className="alert__error">{error}</span>}
      </span>
      <span className="alert__buttons">
        <button className="btn btn--primary" disabled={!!busy} onClick={() => act("approve")}>
          {busy === "approve" ? "Merging…" : "Approve"}
        </button>
        <button className="btn btn--ghost" disabled={!!busy} onClick={() => act("reject")}>
          {busy === "reject" ? "Closing…" : "Reject"}
        </button>
      </span>
    </div>
  );
}

// Pending model approval: a version of the production model tagged approval=pending. Approve moves
// the `champion` alias to it and tags it approved; Reject tags it rejected.
function ModelApprovalAlert({ project, version, onDone }: { project: string; version: ModelApproval; onDone: () => void }) {
  const [busy, setBusy] = useState<"" | "approve" | "reject">("");
  const [error, setError] = useState("");
  const act = async (action: "approve" | "reject") => {
    setBusy(action);
    setError("");
    const { status, data } = await postJson<{ error?: string }>(
      `/api/projects/${encodeURIComponent(project)}/models/versions/${version.version}/${action}`,
      {}
    );
    setBusy("");
    if (status >= 400) setError(data.error || `HTTP ${status}`);
    else onDone();
  };
  return (
    <div className="alert alert--static" data-model-version={version.version}>
      <IconWarning className="alert__icon" />
      <span className="alert__text">
        Pending model approval:{" "}
        <a className="link" href={version.url} target="_blank" rel="noreferrer">
          {version.model} v{version.version}
        </a>{" "}
        <span className="table__muted">(tag approval=pending)</span>
        {error && <span className="alert__error">{error}</span>}
      </span>
      <span className="alert__buttons">
        <button className="btn btn--primary" disabled={!!busy} onClick={() => act("approve")}>
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button className="btn btn--ghost" disabled={!!busy} onClick={() => act("reject")}>
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </span>
    </div>
  );
}

// Project details: creation progress, pending approvals, and the production model run
// (Overview) and its artifacts (Model Artifacts).
export function ProjectDetailsPage() {
  const { name = "" } = useParams();
  const [params] = useSearchParams();
  const active = TABS.find((t) => t.key === params.get("tab")) ?? TABS[0];
  useDocumentTitle(active.label);

  // Catalog record, refreshed while the project is being created.
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    const load = () =>
      getJson<ProjectDetails>(`/api/projects/${encodeURIComponent(name)}`)
        .then((p) => {
          if (!active) return;
          setProject(p);
          if (p.status === "creating") timer = setTimeout(load, POLL_MS);
        })
        .catch((e) => active && setError(e.message));
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, reload]);
  // Pull requests (`#<n>`) and model versions (`v<n>`) approved or rejected here are hidden right
  // away, before the reload.
  const [handled, setHandled] = useState<string[]>([]);
  const onHandled = useCallback((key: string) => {
    setHandled((h) => [...h, key]);
    setReload((n) => n + 1);
  }, []);
  const pending = (project?.pullRequests ?? []).filter((p) => !handled.includes(`#${p.number}`));
  const pendingModels = (project?.modelApprovals ?? []).filter((m) => !handled.includes(`v${m.version}`));
  const ready = project?.status === "ready";

  // Production model (MLflow / UC, user token) and repository tree (GitHub), once ready.
  const [model, setModel] = useState<ProdModel | null>(null);
  const [modelError, setModelError] = useState("");
  const [repo, setRepo] = useState<RepositoryTree | null>(null);
  const [repoError, setRepoError] = useState("");
  useEffect(() => {
    if (!ready) return;
    const base = `/api/projects/${encodeURIComponent(name)}`;
    getJson<ProdModel>(`${base}/model`).then(setModel).catch((e) => setModelError(e.message));
    getJson<RepositoryTree>(`${base}/repository`).then(setRepo).catch((e) => setRepoError(e.message));
  }, [name, ready, reload]);

  const runId = model?.run?.info.run_id;

  return (
    <>
      <div className="breadcrumb">
        <Link className="breadcrumb__link" to="/projects">
          Projects
        </Link>
        <span className="breadcrumb__sep">›</span>
      </div>
      <PageHeader
        title={name}
        actions={project && <ProjectMenu project={project} />}
      />
      {error && <div className="form-alert">{error}</div>}

      {project?.status === "creating" && (
        <div className="message message--progress" data-testid="creating">
          <span className="spinner" aria-hidden />
          <div>
            <div className="message__title">Creating project…</div>
            <div className="message__text">
              The portal registered the project and is now provisioning it in the background: it creates the GitHub repository{" "}
              <code>{project.repo}</code> with a <code>main</code> branch holding only a README, configures the Actions secrets for
              the CI/CD, renders the <code>{project.template}</code> project template and pushes the bundle to the{" "}
              <code>init</code> branch. This page refreshes automatically when the project is ready.
            </div>
          </div>
        </div>
      )}

      {project?.status === "failed" && (
        <div className="message message--error" data-testid="failed">
          <IconWarning className="message__icon" />
          <div>
            <div className="message__title">Project creation failed</div>
            <div className="message__text">{project.error}</div>
          </div>
        </div>
      )}

      {project && !ready && (
        <div className="overview-grid">
          <ProjectDetailsCard project={project} data={null} />
        </div>
      )}

      {ready && (
        <>
          <AlertGroup
            defaultExpanded
            names={[...pending.map((p) => `#${p.number}`), ...pendingModels.map((m) => `${m.model} v${m.version}`)]}
            alerts={[
              ...pending.map((p) => (
                <ApprovalAlert key={`#${p.number}`} project={name} pull={p} onDone={() => onHandled(`#${p.number}`)} />
              )),
              ...pendingModels.map((m) => (
                <ModelApprovalAlert key={`v${m.version}`} project={name} version={m} onDone={() => onHandled(`v${m.version}`)} />
              )),
            ]}
          />
          <div className="page-tabs" role="tablist">
            {TABS.map((t) => (
              <NavLink
                key={t.key}
                to={`?tab=${t.key}`}
                role="tab"
                aria-selected={t.key === active.key}
                className={`page-tab${t.key === active.key ? " page-tab--active" : ""}`}
              >
                {t.label}
              </NavLink>
            ))}
          </div>
          {active.key === "overview" && <RunOverview project={project} data={model} modelError={modelError} repo={repo} repoError={repoError} />}
          {active.key === "artifacts" &&
            (runId ? (
              <ArtifactsBrowser runId={runId} />
            ) : model || modelError ? (
              <section className="card">
                <NoProdModel data={model} error={modelError} />
              </section>
            ) : (
              <div className="card__empty">
                <IconInfo /> Loading…
              </div>
            ))}
        </>
      )}
    </>
  );
}
