import { useState, type ReactNode } from "react";
import type { ProdModel, ProjectDetails, RepositoryTree as Tree } from "../lib/api";
import { IconArrowRight, IconCheckCircle, IconClock, IconFile, IconInfo, IconSearch, IconXCircle } from "../shell/icons";
import { RepositoryTree } from "./RepositoryTree";

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const EMPTY = <span className="table__muted">—</span>;

// Project status as the MLflow run status tag: ready = Finished, creating = Running, failed = Failed.
const STATUS_ICONS = { ready: IconCheckCircle, creating: IconClock, failed: IconXCircle };
function StatusTag({ status }: { status: ProjectDetails["status"] }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`status-tag status-tag--${status}`} role="status">
      <Icon className="status-tag__icon" />
      <span className="status-tag__text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  );
}

// Message shown instead of the MLflow panels when the project has no production model.
export function NoProdModel({ data, error }: { data: ProdModel | null; error: string }) {
  return (
    <div className="message" data-testid="no-prod-model">
      <IconInfo className="message__icon" />
      <div>
        <div className="message__title">No production model</div>
        <div className="message__text">
          {error || (
            <>
              {data?.reason} The production model of this project is the version of <code>{data?.prodModel}</code> with the{" "}
              <code>{data?.alias}</code> alias: its metrics, parameters and artifacts appear here once the CI/CD of the
              repository registers it.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Searchable key/value table (Metrics and Parameters sections of the MLflow run page).
function KeyValueSection({
  title,
  search,
  columns,
  rows,
}: {
  title: string;
  search: string;
  columns: string[];
  rows: { key: string; cells: ReactNode[]; text: string }[];
}) {
  const [filter, setFilter] = useState("");
  const shown = rows.filter((r) => r.text.toLowerCase().includes(filter.toLowerCase()));
  return (
    <section className="kv-section" data-section={title.toLowerCase()}>
      <h4 className="kv-section__title">
        {title} ({rows.length})
      </h4>
      <div className="kv-section__body">
        <label className="filter-input kv-section__search">
          <IconSearch />
          <input placeholder={search} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
        <table className="table table--static kv-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key}>
                {r.cells.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td className="table__empty" colSpan={columns.length}>
                  No {title.toLowerCase()} {filter ? "match the search" : "recorded"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// `Project details` card (MLflow `Run details` layout); model fields come from the production model run.
export function ProjectDetailsCard({ project, data }: { project: ProjectDetails; data: ProdModel | null }) {
  const run = data?.model ? data.run : undefined;
  const model = run && data?.model;
  const host = data?.workspaceHost ?? "";
  const tag = (key: string) => run?.tags.find((t) => t.key === key)?.value;
  const userTags = run ? run.tags.filter((t) => !t.key.startsWith("mlflow.")) : [];
  const jobId = tag("mlflow.databricks.jobID");
  const jobRunId = tag("mlflow.databricks.jobRunID");
  const experiment = data?.experiment;

  const details: [string, ReactNode][] = [
    ["Description", project.description || EMPTY],
    ["Created at", formatDateTime(new Date(project.createdAt).getTime())],
    ["Created by", project.creator || EMPTY],
    ["Status", <StatusTag status={project.status} />],
    [
      "Mlflow Experiment",
      experiment ? (
        <a className="link" href={`${host}/ml/experiments/${experiment.id}`} target="_blank" rel="noreferrer">
          {experiment.name}
        </a>
      ) : (
        EMPTY
      ),
    ],
    [
      "Model registered",
      model ? (
        <span className="run-model">
          <a
            className="link"
            href={`${host}/explore/data/models/${model.catalog}/${model.schema}/${model.modelName}/version/${model.version}`}
            target="_blank"
            rel="noreferrer"
          >
            {model.name}
          </a>
          <span className="chip">v{model.version}</span>
          <span className="chip chip--alias">@{data?.alias}</span>
        </span>
      ) : (
        EMPTY
      ),
    ],
    [
      "Source",
      jobId && jobRunId ? (
        <a className="link" href={`${host}/jobs/${jobId}/runs/${jobRunId}`} target="_blank" rel="noreferrer">
          run {jobRunId} of job {jobId}
        </a>
      ) : (
        tag("mlflow.source.name") ?? EMPTY
      ),
    ],
    [
      "Tags",
      userTags.length ? (
        <span className="chips">
          {userTags.map((t) => (
            <span key={t.key} className="chip">
              <strong>{t.key}:</strong> {t.value}
            </span>
          ))}
        </span>
      ) : (
        EMPTY
      ),
    ],
  ];

  return (
    <section className="card" data-section="project-details">
      <div className="card__header">
        <IconInfo className="card__icon" />
        <h3 className="card__title">Project details</h3>
      </div>
      <table className="details-table">
        <tbody>
          {details.map(([k, v]) => (
            <tr key={k} data-field={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Overview tab: MLflow `Run > Overview` layout with the project details, the production model
// run (metrics and parameters) and the `Artifacts` panel replaced by the repository `main` branch.
export function RunOverview({
  project,
  data,
  modelError,
  repo,
  repoError,
}: {
  project: ProjectDetails;
  data: ProdModel | null;
  modelError: string;
  repo: Tree | null;
  repoError: string;
}) {
  const run = data?.model ? data.run : undefined;
  return (
    <>
      <div className="overview-grid">
        <ProjectDetailsCard project={project} data={data} />
        <section className="card" data-section="repository">
          <div className="card__header">
            <IconFile className="card__icon" />
            <h3 className="card__title">Repository</h3>
            {repo && (
              <a className="btn btn--ghost card__action" href={repo.url} target="_blank" rel="noreferrer">
                View all <IconArrowRight />
              </a>
            )}
          </div>
          {repoError && <div className="form-alert">{repoError}</div>}
          {repo && <RepositoryTree tree={repo} />}
          {!repo && !repoError && <div className="card__empty">Loading…</div>}
        </section>
      </div>

      <div className="overview-grid overview-grid--sections">
        {run ? (
          <>
            <KeyValueSection
              title="Metrics"
              search="Search metrics"
              columns={["Metric", "Latest", "Min", "Max"]}
              rows={run.metrics.map((m) => ({
                key: m.key,
                text: m.key,
                cells: [<span className="link">{m.key}</span>, m.latest, m.min, m.max],
              }))}
            />
            <KeyValueSection
              title="Parameters"
              search="Search parameters"
              columns={["Parameter", "Value"]}
              rows={run.params.map((p) => ({ key: p.key, text: `${p.key} ${p.value}`, cells: [p.key, p.value] }))}
            />
          </>
        ) : (
          <section className="card overview-grid__full">
            {data || modelError ? <NoProdModel data={data} error={modelError} /> : <div className="card__empty">Loading…</div>}
          </section>
        )}
      </div>
    </>
  );
}
