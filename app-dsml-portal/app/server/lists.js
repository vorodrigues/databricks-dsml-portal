// Workspace objects offered in the Create new project form, listed with the user token (OBO):
// each list holds only what the user can access.
import { Router } from "express";
import { HttpError, workspaceApi } from "./workspace.js";

// Follows `next_page_token` of the Unity Catalog / Feature Engineering list APIs (stops on a repeated token).
async function listPaged(req, path, key, sizeParam = "max_results", pageSize = 1000) {
  const items = [];
  const seen = new Set();
  let token;
  do {
    seen.add(token);
    const sep = path.includes("?") ? "&" : "?";
    const page = await workspaceApi(req, `${path}${sep}${sizeParam}=${pageSize}${token ? `&page_token=${encodeURIComponent(token)}` : ""}`);
    items.push(...(page[key] || []));
    token = page.next_page_token;
  } while (token && !seen.has(token));
  return items;
}

// Follows `startIndex` / `itemsPerPage` of the SCIM list APIs.
async function listScim(req, resource, attributes) {
  const items = [];
  for (let start = 1; ; ) {
    const page = await workspaceApi(req, `/api/2.0/preview/scim/v2/${resource}?attributes=${attributes}&startIndex=${start}&count=1000`);
    const resources = page.Resources || [];
    items.push(...resources);
    start += resources.length;
    if (!resources.length || start > (page.totalResults || 0)) return items;
  }
}

const byName = (a, b) => a.name.localeCompare(b.name);

export function listsRouter(wrap) {
  const router = Router();
  router.get(
    "/workspace/catalogs",
    wrap(async (req) =>
      (await listPaged(req, "/api/2.1/unity-catalog/catalogs", "catalogs")).map((c) => ({ name: c.name })).sort(byName)
    )
  );
  router.get(
    "/workspace/schemas",
    wrap(async (req) => {
      const catalog = String(req.query.catalog || "");
      if (!catalog) throw new HttpError(400, "Query parameter catalog is required");
      const path = `/api/2.1/unity-catalog/schemas?catalog_name=${encodeURIComponent(catalog)}`;
      return (await listPaged(req, path, "schemas")).map((s) => ({ name: s.name })).sort(byName);
    })
  );
  // Online stores of the Feature Engineering API (Lakebase instances used by `fe.get_online_store`).
  router.get(
    "/workspace/online-stores",
    wrap(async (req) => {
      const stores = (await listPaged(req, "/api/2.0/feature-store/online-stores", "online_stores", "page_size"))
        .map((i) => ({ name: i.name, state: i.state }));
      // Lakebase autoscaling projects are not returned by the Feature Engineering list API.
      const projects = await listPaged(req, "/api/2.0/postgres/projects", "projects", "page_size", 100);
      for (const p of projects)
        if (!stores.some((s) => s.name === p.project_id)) stores.push({ name: p.project_id });
      return stores.sort(byName);
    })
  );
  router.get(
    "/workspace/service-principals",
    wrap(async (req) =>
      (await listScim(req, "ServicePrincipals", "displayName,applicationId"))
        .map((sp) => ({ name: sp.displayName || sp.applicationId, applicationId: sp.applicationId }))
        .sort(byName)
    )
  );
  router.get(
    "/workspace/groups",
    wrap(async (req) =>
      (await listScim(req, "Groups", "displayName")).map((g) => ({ name: g.displayName })).sort(byName)
    )
  );
  return router;
}
