// Project Template renderer (subset of Databricks bundle templates): files are copied verbatim,
// except `*.tmpl` files, where `{{.param}}` is replaced and the suffix is dropped.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Built app: build/templates/<dir>.json (packed by build.mjs); local run: <repo>/templates/<dir>.
const TEMPLATES_DIR = [path.join(__dirname, "..", "templates"), path.join(__dirname, "..", "..", "templates")].find(
  (dir) => fs.existsSync(dir)
);

export const TEMPLATES = { Classification: "classification" };

// Reads a template folder as { schema, files: [{ path, content: Buffer }] }.
export function readTemplateDir(dir) {
  const root = path.join(dir, "template");
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push({ path: path.relative(root, full).split(path.sep).join("/"), content: fs.readFileSync(full) });
    }
  };
  walk(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { schema: JSON.parse(fs.readFileSync(path.join(dir, "databricks_template_schema.json"), "utf8")), files };
}

const cache = {};
function loadTemplate(template) {
  const name = TEMPLATES[template];
  if (!cache[name]) {
    const packed = path.join(TEMPLATES_DIR, `${name}.json`);
    cache[name] = fs.existsSync(packed)
      ? (({ schema, files }) => ({ schema, files: files.map((f) => ({ path: f.path, content: Buffer.from(f.content, "base64") })) }))(
          JSON.parse(fs.readFileSync(packed, "utf8"))
        )
      : readTemplateDir(path.join(TEMPLATES_DIR, name));
  }
  return cache[name];
}

export const templateSchema = (template) => loadTemplate(template).schema;

// Checks every schema property: required non-empty single-line string matching `pattern`.
export function validateParams(schema, params) {
  const errors = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    const value = params[key];
    if (typeof value !== "string" || !value.trim()) errors[key] = "Required";
    else if (/[\r\n]/.test(value) || value !== value.trim()) errors[key] = "Must be a single line without surrounding spaces";
    else if (prop.pattern && !new RegExp(prop.pattern).test(value))
      errors[key] = prop.pattern_match_failure_message || `Must match ${prop.pattern}`;
  }
  for (const key of Object.keys(params)) if (!(key in schema.properties)) errors[key] = "Unknown parameter";
  return errors;
}

// Returns [{ path, content: Buffer }] for the rendered bundle.
export function renderTemplate(template, params) {
  return loadTemplate(template).files.map(({ path: rel, content }) => {
    if (!rel.endsWith(".tmpl")) return { path: rel, content };
    const text = content.toString("utf8").replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, key) => {
      if (!(key in params)) throw new Error(`Template ${rel} uses unknown parameter ${key}`);
      return params[key];
    });
    if (text.includes("{{")) throw new Error(`Template ${rel} has unsupported template actions`);
    return { path: rel.slice(0, -".tmpl".length), content: Buffer.from(text, "utf8") };
  });
}
