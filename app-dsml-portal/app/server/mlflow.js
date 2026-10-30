// Production model of a project (UC alias `champion`) and its MLflow source run, read with the
// user token (OBO): the user only sees the model, run and artifacts they can access.
import { Router } from "express";
import { HttpError, userToken, workspaceApi, WORKSPACE_HOST } from "./workspace.js";
import { getProject } from "./catalog.js";

export const PROD_ALIAS = "champion";
// Largest artifact served for preview.
export const PREVIEW_LIMIT = 2 * 1024 * 1024;

const TEXT_EXT = new Set(["txt", "yaml", "yml", "json", "md", "py", "csv", "tsv", "log", "cfg", "ini", "toml", "sh", "sql", "r", "html", "xml", "js", "ts"]);
const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp", bmp: "image/bmp" };

// Preview kind from the file name; files without extension (e.g. MLmodel) are YAML text.
export function previewKind(path) {
  const base = path.split("/").pop();
  const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
  if (!ext || TEXT_EXT.has(ext)) return "text";
  if (ext in IMAGE_TYPES) return "image";
  return "binary";
}

const enc = encodeURIComponent;

// Version behind the `champion` alias, or a `reason` explaining why there is no production model.
async function championVersion(req, fullName) {
  try {
    await workspaceApi(req, `/api/2.1/unity-catalog/models/${enc(fullName)}`);
  } catch (e) {
    if (e.status === 404) return { reason: `The registered model ${fullName} does not exist yet.` };
    if (e.status === 403) return { reason: `You do not have access to the registered model ${fullName}.` };
    throw e;
  }
  try {
    return { version: await workspaceApi(req, `/api/2.1/unity-catalog/models/${enc(fullName)}/aliases/${PROD_ALIAS}`) };
  } catch (e) {
    if (e.status === 404) return { reason: `The registered model ${fullName} has no version with the "${PROD_ALIAS}" alias.` };
    throw e;
  }
}

// Latest / min / max of each metric (metric history), as in the MLflow run page.
async function metricSummaries(req, runId, metrics) {
  return Promise.all(
    metrics.map(async (m) => {
      const { metrics: history = [] } = await workspaceApi(
        req,
        `/api/2.0/mlflow/metrics/get-history?run_id=${enc(runId)}&metric_key=${enc(m.key)}&max_results=25000`
      );
      const values = history.length ? history.map((h) => h.value) : [m.value];
      return { key: m.key, latest: m.value, min: Math.min(...values), max: Math.max(...values) };
    })
  );
}

// Prod experiment of the project looked up by name (`<root_path_prod>/<experiment_name>`), or null.
async function prodExperiment(req, params = {}) {
  if (!params.root_path_prod || !params.experiment_name) return null;
  try {
    const { experiment } = await workspaceApi(
      req,
      `/api/2.0/mlflow/experiments/get-by-name?experiment_name=${enc(`${params.root_path_prod}/${params.experiment_name}`)}`
    );
    return { id: experiment.experiment_id, name: experiment.name };
  } catch (e) {
    if (e.status === 404 || e.status === 403) return null;
    throw e;
  }
}

async function prodModel(req) {
  const row = await getProject(req.params.name);
  if (!row) throw new HttpError(404, `Project ${req.params.name} not found`);
  const name = row.prod_model;
  const { version, reason } = await championVersion(req, name);
  if (!version)
    return {
      workspaceHost: WORKSPACE_HOST,
      prodModel: name,
      alias: PROD_ALIAS,
      model: null,
      reason,
      experiment: await prodExperiment(req, row.params),
    };

  const { run } = await workspaceApi(req, `/api/2.0/mlflow/runs/get?run_id=${enc(version.run_id)}`);
  const { experiment } = await workspaceApi(req, `/api/2.0/mlflow/experiments/get?experiment_id=${enc(run.info.experiment_id)}`);
  const data = run.data || {};
  return {
    workspaceHost: WORKSPACE_HOST,
    prodModel: name,
    alias: PROD_ALIAS,
    model: {
      name,
      version: String(version.version),
      catalog: version.catalog_name,
      schema: version.schema_name,
      modelName: version.model_name,
    },
    experiment: { id: experiment.experiment_id, name: experiment.name },
    run: {
      info: run.info,
      metrics: await metricSummaries(req, run.info.run_id, data.metrics || []),
      params: data.params || [],
      tags: data.tags || [],
    },
  };
}

// One level of the run artifact tree.
async function listArtifacts(req) {
  const { runId } = req.params;
  const path = String(req.query.path || "");
  const res = await workspaceApi(req, `/api/2.0/mlflow/artifacts/list?run_id=${enc(runId)}${path ? `&path=${enc(path)}` : ""}`);
  return (res.files || []).map((f) => ({ path: f.path, isDir: f.is_dir, size: f.file_size == null ? null : Number(f.file_size) }));
}

// Raw artifact content for preview (type inferred from the extension); binaries are not served
// and content beyond PREVIEW_LIMIT is rejected.
async function getArtifact(req, res) {
  const { runId } = req.params;
  const path = String(req.query.path || "");
  const kind = previewKind(path);
  try {
    if (!path) throw new HttpError(400, "Missing artifact path");
    if (kind === "binary") throw new HttpError(415, "Preview is not available for this file type.");
    const upstream = await fetch(`${WORKSPACE_HOST}/api/2.0/mlflow/get-artifact?run_uuid=${enc(runId)}&path=${enc(path)}`, {
      headers: { Authorization: `Bearer ${userToken(req)}` },
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      let message = text;
      try {
        message = JSON.parse(text).message || text;
      } catch {}
      throw new HttpError(upstream.status, message);
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of upstream.body) {
      size += chunk.length;
      if (size > PREVIEW_LIMIT) {
        await upstream.body.cancel().catch(() => {});
        throw new HttpError(413, `File is larger than the ${PREVIEW_LIMIT / 1024 / 1024} MB preview limit.`);
      }
      chunks.push(chunk);
    }
    const ext = path.split(".").pop().toLowerCase();
    res.set("Content-Type", kind === "image" ? IMAGE_TYPES[ext] : "text/plain; charset=utf-8");
    res.set("Cache-Control", "private, max-age=300");
    res.send(Buffer.concat(chunks));
  } catch (e) {
    console.error("[api]", req.method, req.path, e.message);
    res.status(e instanceof HttpError ? e.status : 500).json({ error: e.message });
  }
}

// Model approvals: versions of the production model tagged `approval=pending`, read with the user
// token and cached per user and model for a short time.
export const APPROVAL_TAG = "approval";
const APPROVALS_CACHE_MS = 60000;
const approvalsCache = new Map();

const approvalOf = (version) => (version.tags || []).find((t) => t.key === APPROVAL_TAG)?.value ?? null;

function versionUrl(fullName, version) {
  const [catalog, schema, model] = fullName.split(".");
  return `${WORKSPACE_HOST}/explore/data/models/${catalog}/${schema}/${model}/version/${version}`;
}

// Pending versions of a registered model (empty when it does not exist or the user cannot access it).
export async function pendingModelVersions(req, fullName) {
  const key = `${req.get("x-forwarded-email") || ""}|${fullName}`;
  const hit = approvalsCache.get(key);
  if (hit && Date.now() - hit.at < APPROVALS_CACHE_MS) return hit.data;
  const versions = [];
  try {
    let token = "";
    do {
      const res = await workspaceApi(
        req,
        `/api/2.1/unity-catalog/models/${enc(fullName)}/versions?max_results=100${token ? `&page_token=${enc(token)}` : ""}`
      );
      versions.push(...(res.model_versions || []));
      token = res.model_versions?.length ? res.next_page_token : "";
    } while (token);
  } catch (e) {
    if (e.status !== 404 && e.status !== 403) throw e;
  }
  const data = versions
    .filter((v) => approvalOf(v) === "pending")
    .map((v) => ({ model: fullName, version: String(v.version), url: versionUrl(fullName, v.version) }))
    .sort((a, b) => Number(a.version) - Number(b.version));
  approvalsCache.set(key, { at: Date.now(), data });
  return data;
}

// Approve moves the `champion` alias to the version and tags it `approval=approved`; Reject tags it
// `approval=rejected`. Only versions still `pending` are accepted. The alias is set first, so a
// failure leaves the version pending and the action can be retried.
async function modelApproval(req) {
  const row = await getProject(req.params.name);
  if (!row) throw new HttpError(404, `Project ${req.params.name} not found`);
  const { action } = req.params;
  if (action !== "approve" && action !== "reject") throw new HttpError(404, `Unknown action ${action}`);
  const version = Number(req.params.version);
  if (!Number.isInteger(version) || version < 1) throw new HttpError(400, "Invalid model version");
  const name = row.prod_model;
  const current = await workspaceApi(req, `/api/2.1/unity-catalog/models/${enc(name)}/versions/${version}`);
  const approval = approvalOf(current);
  if (approval !== "pending")
    throw new HttpError(409, `Version ${version} of ${name} is not pending approval (tag ${APPROVAL_TAG}=${approval ?? "unset"})`);
  try {
    if (action === "approve")
      await workspaceApi(req, `/api/2.1/unity-catalog/models/${enc(name)}/aliases/${PROD_ALIAS}`, {
        method: "PUT",
        body: { version_num: version },
      });
    const value = action === "approve" ? "approved" : "rejected";
    await workspaceApi(req, "/api/2.0/mlflow/unity-catalog/model-versions/set-tag", {
      method: "POST",
      body: { name, version: String(version), key: APPROVAL_TAG, value },
    });
    console.log(`[models] ${name} v${version} ${value} by ${req.get("x-forwarded-email") || "unknown user"}`);
    return { model: name, version: String(version), approval: value, ...(action === "approve" && { alias: PROD_ALIAS }) };
  } finally {
    for (const key of approvalsCache.keys()) if (key.endsWith(`|${name}`)) approvalsCache.delete(key);
  }
}

export function mlflowRouter(wrap) {
  const router = Router();
  router.get("/projects/:name/model", wrap(prodModel));
  router.post("/projects/:name/models/versions/:version/:action", wrap(modelApproval));
  router.get("/runs/:runId/artifacts", wrap(listArtifacts));
  router.get("/runs/:runId/artifact", getArtifact);
  return router;
}
