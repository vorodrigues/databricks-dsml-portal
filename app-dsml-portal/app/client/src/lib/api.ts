// Minimal JSON client for the backend /api routes.
export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${path} returned HTTP ${res.status}`);
  return data as T;
}

export type Me = {
  user: { id: string; userName: string; displayName: string };
  identity: string;
  tokenScopes: string[];
  appServicePrincipal: string;
};

// POST with a JSON body; returns the status and the parsed body (also on errors).
export async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// DELETE; returns the status and the parsed body (also on errors).
export async function deleteJson<T>(path: string): Promise<{ status: number; data: T }> {
  const res = await fetch(path, { method: "DELETE" });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export type ApiError = { error?: string; fields?: Record<string, string> };

export type GithubOwner = { login: string; name: string | null; avatarUrl: string; htmlUrl: string };

export type TemplateProperty = {
  type: string;
  description: string;
  default: string;
  pattern?: string;
  pattern_match_failure_message?: string;
  order: number;
};

export type TemplateInfo = {
  template: string;
  description: string;
  properties: Record<string, TemplateProperty>;
  defaults: Record<string, string>;
};

export type Project = {
  name: string;
  template: string;
  repo: string;
  repoUrl: string;
  visibility: "private" | "public" | null;
  description: string | null;
  creator: string;
  createdAt: string;
  updatedAt: string;
  // Last push to the repository (null while the repository does not exist).
  modified: string | null;
  // Open pull requests to main plus model versions pending approval.
  pendingApprovals: number;
  pendingPulls: number;
  modelApprovals: ModelApproval[];
  status: "creating" | "ready" | "failed";
  error: string | null;
};

// Commits per day on `main` of the visible repositories; count is null for days after today.
export type Activity = {
  start: string;
  end: string;
  today: string;
  repos: string[];
  days: { date: string; count: number | null }[];
};

// Version of the production model tagged approval=pending.
export type ModelApproval = { model: string; version: string; url: string };

export type PullRequest = { number: number; title: string; url: string; head: string; author: string };

export type ProjectDetails = Project & { pullRequests: PullRequest[]; prodModel: string; params: Record<string, string> };

// Production model (alias `champion`) and its MLflow source run; `model` is null when there is none.
export type ProdModel = {
  workspaceHost: string;
  prodModel: string;
  alias: string;
  model: { name: string; version: string; catalog: string; schema: string; modelName: string } | null;
  reason?: string;
  // Experiment of the champion run, or the prod experiment looked up by name (null if missing).
  experiment?: { id: string; name: string } | null;
  run?: {
    info: { run_id: string; run_name: string; experiment_id: string; status: string; start_time: number; end_time?: number };
    metrics: { key: string; latest: number; min: number; max: number }[];
    params: { key: string; value: string }[];
    tags: { key: string; value: string }[];
  };
};

export type ArtifactFile = { path: string; isDir: boolean; size: number | null };

export type RepositoryTree = {
  repo: string;
  url: string;
  branch: string;
  truncated: boolean;
  entries: { path: string; isDir: boolean; size: number | null; url: string }[];
};
