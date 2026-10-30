// DSML Portal backend: serves the React build and the /api routes.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError, tokenScopes, workspaceApi } from "./workspace.js";
import { query } from "./db.js";
import { ensureCatalog } from "./catalog.js";
import { projectsRouter } from "./projects.js";
import { listsRouter } from "./lists.js";
import { activityRouter } from "./activity.js";
import { mlflowRouter } from "./mlflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
const PORT = process.env.DATABRICKS_APP_PORT || 8787;

const app = express();
app.use(express.json());

// Wraps async handlers and maps errors to JSON responses (`fields` holds per-field validation errors).
const wrap = (handler, status = 200) => async (req, res) => {
  try {
    res.status(status).json(await handler(req));
  } catch (e) {
    console.error("[api]", req.method, req.path, e.message);
    res.status(e instanceof HttpError ? e.status : 500).json({ error: e.message, ...(e.fields && { fields: e.fields }) });
  }
};

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Current user resolved from the forwarded user token, next to the app identity.
app.get(
  "/api/me",
  wrap(async (req) => {
    const me = await workspaceApi(req, "/api/2.0/preview/scim/v2/Me");
    return {
      user: { id: me.id, userName: me.userName, displayName: me.displayName },
      identity: "user (on-behalf-of)",
      tokenScopes: tokenScopes(req),
      appServicePrincipal: process.env.DATABRICKS_CLIENT_ID,
    };
  })
);

// Portal catalog connectivity with the app identity.
app.get(
  "/api/db/ping",
  wrap(async () => {
    const [row] = await query(
      "SELECT current_user AS db_user, current_database() AS database, version() AS version"
    );
    return row;
  })
);

app.use("/api", projectsRouter(wrap));
app.use("/api", listsRouter(wrap));
app.use("/api", activityRouter(wrap));
app.use("/api", mlflowRouter(wrap));

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Static assets of the Vite build, with SPA fallback for client-side routes.
app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`[server] DSML Portal listening on 0.0.0.0:${PORT}`));

// Startup check of the portal catalog connection (app identity) and idempotent catalog setup.
if (process.env.PGHOST) {
  query("SELECT current_user AS db_user, current_database() AS database")
    .then(([row]) => console.log(`[db] connected to ${row.database} as ${row.db_user}`))
    .then(ensureCatalog)
    .then(() => console.log("[db] catalog table portal.projects ready"))
    .catch((e) => console.error("[db] catalog setup failed:", e.message));
}
