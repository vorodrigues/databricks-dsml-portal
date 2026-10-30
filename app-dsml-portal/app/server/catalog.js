// Portal catalog: one row per project in `portal.projects` (database dsml_portal), with the app identity.
import { query } from "./db.js";

// Idempotent: existing table and rows are kept across restarts and redeploys.
export const DDL = `
CREATE SCHEMA IF NOT EXISTS portal;
CREATE TABLE IF NOT EXISTS portal.projects (
  name        text PRIMARY KEY,
  template    text NOT NULL,
  repo        text NOT NULL,
  creator     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL CHECK (status IN ('creating', 'ready', 'failed')),
  error       text,
  params      jsonb NOT NULL,
  prod_model  text NOT NULL
);`;

export async function ensureCatalog() {
  await query(DDL);
  // Creations cut short by a restart never finish: mark them as failed.
  await query(
    `UPDATE portal.projects SET status = 'failed', error = 'Creation interrupted by an app restart', updated_at = now()
     WHERE status = 'creating' AND updated_at < now() - interval '10 minutes'`
  );
}

export const listProjects = () => query("SELECT * FROM portal.projects ORDER BY created_at DESC");

export async function getProject(name) {
  const [row] = await query("SELECT * FROM portal.projects WHERE name = $1", [name]);
  return row || null;
}

// Returns the new row, or null when the name is already taken.
export async function insertProject(p) {
  const [row] = await query(
    `INSERT INTO portal.projects (name, template, repo, creator, status, params, prod_model)
     VALUES ($1, $2, $3, $4, 'creating', $5, $6)
     ON CONFLICT (name) DO NOTHING RETURNING *`,
    [p.name, p.template, p.repo, p.creator, JSON.stringify(p.params), p.prodModel]
  );
  return row || null;
}

export async function setStatus(name, status, error = null) {
  await query("UPDATE portal.projects SET status = $2, error = $3, updated_at = now() WHERE name = $1", [
    name,
    status,
    error,
  ]);
}

// Removes only the catalog row (repository, workspace assets and commits are kept).
// Returns the removed row, or null when the project does not exist or is still being created.
export async function deleteProject(name) {
  const [row] = await query("DELETE FROM portal.projects WHERE name = $1 AND status <> 'creating' RETURNING *", [name]);
  return row || null;
}
