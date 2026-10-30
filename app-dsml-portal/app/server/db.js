// Portal catalog in Lakebase. The app service principal connects with an OAuth token
// as password; host, port, database, user and sslmode come from the database resource (PG* env).
import pg from "pg";

const HOST = `https://${(process.env.DATABRICKS_HOST || "").replace(/^https?:\/\//, "")}`;

let cached = { token: null, expiresAt: 0 };

// Machine-to-machine token of the app service principal (refreshed before expiry).
async function servicePrincipalToken() {
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;
  const basic = Buffer.from(
    `${process.env.DATABRICKS_CLIENT_ID}:${process.env.DATABRICKS_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${HOST}/oidc/v1/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=all-apis",
  });
  if (!res.ok) throw new Error(`Service principal token request failed (HTTP ${res.status})`);
  const data = await res.json();
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  return cached.token;
}

export const pool = new pg.Pool({
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  password: servicePrincipalToken,
  max: 5,
});

export async function query(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows;
}
