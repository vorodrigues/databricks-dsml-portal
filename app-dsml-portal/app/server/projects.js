// Projects API: catalog rows enriched with GitHub data, and the asynchronous creation flow.
import { Router } from "express";
import { HttpError, workspaceApi } from "./workspace.js";
import { branchTree, closePull, createRepo, getRepo, mergePull, openPullsToMain, owner, pushBranch, setActionsSecrets } from "./github.js";
import { deleteProject, getProject, insertProject, listProjects, setStatus } from "./catalog.js";
import { renderTemplate, templateSchema, TEMPLATES, validateParams } from "./template.js";
import { pendingModelVersions } from "./mlflow.js";

export const NAME_PATTERN = /^[a-z][a-z0-9-]{2,49}$/;
const REPO_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
const WORKSPACE_HOST = `https://${(process.env.DATABRICKS_HOST || "").replace(/^https?:\/\//, "")}`;

class ValidationError extends HttpError {
  constructor(fields) {
    super(400, `Invalid request: ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("; ")}`);
    this.fields = fields;
  }
}

// Bundle parameters with the defaults that depend on the project name and the current user.
export function defaultParams(template, name, devUser) {
  const defaults = Object.fromEntries(
    Object.entries(templateSchema(template).properties).map(([key, prop]) => [key, prop.default])
  );
  const user = devUser || defaults.dev_user;
  return {
    ...defaults,
    bundle_name: name.replace(/-/g, "_"),
    workspace_host: WORKSPACE_HOST,
    dev_user: user,
    root_path_dev: `/Workspace/Users/${user}/${name}/dev`,
    root_path_staging: `/Workspace/${name}/staging`,
    root_path_prod: `/Workspace/${name}/prod`,
  };
}

// Catalog row in API shape, with Modified (last push) and Pending approvals (open PRs to main plus
// versions of the production model tagged approval=pending, the latter only with a user request).
// Returns null when a ready project's repository is not accessible with the GitHub credential;
// projects still creating (or failed) are shown even before their repository exists.
async function present(row, { withPulls = false, req } = {}) {
  const repo = await getRepo(row.repo);
  if (!repo && row.status === "ready") return null;
  const [pulls, modelApprovals] = await Promise.all([
    repo ? openPullsToMain(row.repo) : [],
    req && row.status === "ready" && row.prod_model ? pendingModelVersions(req, row.prod_model) : [],
  ]);
  return {
    name: row.name,
    template: row.template,
    repo: row.repo,
    repoUrl: `https://github.com/${row.repo}`,
    visibility: repo ? repo.visibility : null,
    description: repo ? repo.description : null,
    creator: row.creator,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modified: repo ? repo.pushed_at : null,
    pendingApprovals: pulls.length + modelApprovals.length,
    pendingPulls: pulls.length,
    modelApprovals,
    ...(withPulls && { pullRequests: pulls }),
    status: row.status,
    error: row.error,
    params: row.params,
    prodModel: row.prod_model,
  };
}

// Catalog projects visible with the GitHub credential (see `present`).
export async function listVisibleProjects(req) {
  return (await Promise.all((await listProjects()).map((row) => present(row, { req })))).filter(Boolean);
}

// Steps 2-5 of the creation flow; any failure leaves the project as failed with the error.
async function provision(project, { description, visibility, files, failAfterInsert }) {
  try {
    if (failAfterInsert) throw new Error("Induced test failure after the catalog insert (testFailAfterInsert)");
    const repoName = project.repo.split("/")[1];
    await createRepo({ name: repoName, description, visibility });
    await setActionsSecrets(project.repo, {
      DATABRICKS_HOST: WORKSPACE_HOST,
      DATABRICKS_CLIENT_ID: process.env.MLOPS_SP_CLIENT_ID,
      DATABRICKS_CLIENT_SECRET: process.env.MLOPS_SP_CLIENT_SECRET,
    });
    await pushBranch(project.repo, "init", files, `Initial ${project.template} bundle for ${project.name}`);
    await setStatus(project.name, "ready");
    console.log(`[projects] ${project.name} ready (${project.repo})`);
  } catch (e) {
    console.error(`[projects] ${project.name} failed:`, e.message);
    await setStatus(project.name, "failed", e.message).catch((err) => console.error("[projects]", err.message));
  }
}

// Validates the request and inserts the project as `creating`; provisioning continues in background.
async function createProject(req) {
  const body = req.body || {};
  const name = body.name;
  const template = body.template || "Classification";
  const repository = body.repository || {};
  const repoName = repository.name || name;
  const visibility = repository.visibility || "private";
  const description = repository.description || "";
  const failAfterInsert = body.testFailAfterInsert === true;

  const fields = {};
  if (typeof name !== "string" || !NAME_PATTERN.test(name))
    fields.name = "Required: 3-50 characters, lowercase letters, digits and hyphens, starting with a letter";
  if (!(template in TEMPLATES)) fields.template = `Unknown template (available: ${Object.keys(TEMPLATES).join(", ")})`;
  if (typeof repoName !== "string" || !REPO_PATTERN.test(repoName))
    fields["repository.name"] = "Use up to 100 letters, digits, '.', '-' or '_'";
  if (!["private", "public"].includes(visibility)) fields["repository.visibility"] = "Use private or public";
  if (typeof description !== "string" || /[\r\n]/.test(description) || description.length > 350)
    fields["repository.description"] = "Single line, up to 350 characters";
  if (failAfterInsert && !String(name).startsWith("test-"))
    fields.testFailAfterInsert = "Only allowed for project names starting with test-";
  if (Object.keys(fields).length) throw new ValidationError(fields);

  const me = await workspaceApi(req, "/api/2.0/preview/scim/v2/Me");
  // dev_user is always the signed-in user.
  const params = { ...defaultParams(template, name, me.userName), ...(body.params || {}), dev_user: me.userName };
  const paramErrors = validateParams(templateSchema(template), params);
  if (Object.keys(paramErrors).length)
    throw new ValidationError(Object.fromEntries(Object.entries(paramErrors).map(([k, v]) => [`params.${k}`, v])));
  const files = renderTemplate(template, params);

  if (await getProject(name)) throw new HttpError(409, `Project ${name} already exists`);
  const repo = `${(await owner()).login}/${repoName}`;
  if (await getRepo(repo)) throw new HttpError(409, `Repository ${repo} already exists`);

  const row = await insertProject({
    name,
    template,
    repo,
    creator: me.userName,
    params,
    prodModel: `${params.catalog}.${params.schema_prod}.${params.model_name}`,
  });
  if (!row) throw new HttpError(409, `Project ${name} already exists`);
  provision(row, { description, visibility, files, failAfterInsert });
  return present(row);
}

async function requireProject(name) {
  const row = await getProject(name);
  if (!row) throw new HttpError(404, `Project ${name} not found`);
  return row;
}

export function projectsRouter(wrap) {
  const router = Router();
  router.get("/github/owner", wrap(() => owner()));
  // Template parameters with the defaults for `?name=<project_name>` and the current user.
  router.get(
    "/templates/:template",
    wrap(async (req) => {
      const { template } = req.params;
      if (!(template in TEMPLATES)) throw new HttpError(404, `Template ${template} not found`);
      const me = await workspaceApi(req, "/api/2.0/preview/scim/v2/Me");
      const schema = templateSchema(template);
      return {
        template,
        description: schema.welcome_message,
        properties: schema.properties,
        defaults: defaultParams(template, String(req.query.name || ""), me.userName),
      };
    })
  );
  router.get("/projects", wrap(listVisibleProjects));
  router.get(
    "/projects/:name",
    wrap(async (req) => {
      const row = await getProject(req.params.name);
      const project = row && (await present(row, { withPulls: true, req }));
      if (!project) throw new HttpError(404, `Project ${req.params.name} not found`);
      return project;
    })
  );
  router.post("/projects", wrap(createProject, 202));
  // Removes the project from the portal catalog only; projects still being created cannot be removed.
  router.delete(
    "/projects/:name",
    wrap(async (req) => {
      const { name } = req.params;
      if (!NAME_PATTERN.test(name)) throw new HttpError(400, `Invalid project name ${name}`);
      if (await deleteProject(name)) {
        console.log(`[projects] ${name} removed from the catalog by ${req.get("x-forwarded-email") || "unknown user"}`);
        return { name, deleted: true };
      }
      await requireProject(name);
      throw new HttpError(409, `Project ${name} is being created and cannot be deleted yet`);
    })
  );
  // Files of the `main` branch of the project repository.
  router.get(
    "/projects/:name/repository",
    wrap(async (req) => {
      const row = await requireProject(req.params.name);
      const tree = await branchTree(row.repo, "main");
      if (!tree) throw new HttpError(404, `Branch main of ${row.repo} not found`);
      return { repo: row.repo, url: `https://github.com/${row.repo}`, branch: "main", ...tree };
    })
  );
  // Pending approvals: Approve merges the pull request into main, Reject closes it.
  router.post(
    "/projects/:name/pulls/:number/:action",
    wrap(async (req) => {
      const row = await requireProject(req.params.name);
      const number = Number(req.params.number);
      if (!Number.isInteger(number) || number < 1) throw new HttpError(400, "Invalid pull request number");
      if (req.params.action === "approve") return mergePull(row.repo, number);
      if (req.params.action === "reject") return closePull(row.repo, number);
      throw new HttpError(404, `Unknown action ${req.params.action}`);
    })
  );
  return router;
}
