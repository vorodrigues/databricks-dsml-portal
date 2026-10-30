// Workspace REST client. Every call uses the user's token forwarded by Databricks Apps
// (on-behalf-of-user), so the user only sees what they are allowed to access.
export const WORKSPACE_HOST = `https://${(process.env.DATABRICKS_HOST || "").replace(/^https?:\/\//, "")}`;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// User token injected by the Apps proxy in each request.
export function userToken(req) {
  const token = req.get("x-forwarded-access-token");
  if (!token) throw new HttpError(401, "Missing user token (x-forwarded-access-token)");
  return token;
}

export async function workspaceApi(req, path, { method = "GET", body } = {}) {
  const res = await fetch(`${WORKSPACE_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${userToken(req)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new HttpError(res.status, data.message || data.detail || text);
  return data;
}

// Scopes granted to the user token (JWT "scope" claim), for diagnostics.
export function tokenScopes(req) {
  try {
    const payload = userToken(req).split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return String(claims.scope || "").split(" ").filter(Boolean).sort();
  } catch {
    return [];
  }
}
