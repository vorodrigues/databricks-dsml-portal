import { useEffect, useState, type ReactNode } from "react";
import { getJson, type ArtifactFile } from "../lib/api";
import { IconFile, IconInfo } from "../shell/icons";
import { baseName, formatBytes, TreeItem } from "./TreeItem";

// Same limit as the backend artifact endpoint.
const PREVIEW_LIMIT = 2 * 1024 * 1024;
const TEXT_EXT = new Set(["txt", "yaml", "yml", "json", "md", "py", "csv", "tsv", "log", "cfg", "ini", "toml", "sh", "sql", "r", "html", "xml", "js", "ts"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]);

// Preview kind from the file name; files without extension (e.g. MLmodel) are YAML text.
function previewKind(path: string) {
  const base = baseName(path);
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (!ext || TEXT_EXT.has(ext)) return "text";
  if (IMAGE_EXT.has(ext)) return "image";
  return "binary";
}

const isYaml = (path: string) => /\.ya?ml$/i.test(path) || !baseName(path).includes(".");

// YAML line with keys and values colored as in the workspace code viewer.
function yamlLine(line: string): ReactNode {
  const m = line.match(/^(\s*-?\s*)([^:#\s][^:#]*?:)(\s.*|)$/);
  if (m) return <>{m[1]}<span className="code__key">{m[2]}</span><span className="code__value">{m[3]}</span></>;
  const item = line.match(/^(\s*-\s)(.*)$/);
  if (item) return <>{item[1]}<span className="code__value">{item[2]}</span></>;
  return line;
}

function CodeView({ path, text }: { path: string; text: string }) {
  const lines = text.split("\n");
  return (
    <div className="code" data-testid="artifact-text">
      {lines.map((line, i) => (
        <div key={i} className="code__line">
          <span className="code__number">{i + 1}</span>
          <span className="code__text">{isYaml(path) ? yamlLine(line) : line}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewMessage({ children }: { children: ReactNode }) {
  return (
    <div className="message message--center" data-testid="artifact-no-preview">
      <IconInfo className="message__icon" />
      <div className="message__text">{children}</div>
    </div>
  );
}

const artifactUrl = (runId: string, path: string) => `/api/runs/${runId}/artifact?path=${encodeURIComponent(path)}`;

// Preview of the selected artifact (text / JSON / YAML / image); binaries only show metadata.
function ArtifactPreview({ runId, file }: { runId: string; file: ArtifactFile }) {
  const kind = previewKind(file.path);
  const tooLarge = file.size != null && file.size > PREVIEW_LIMIT;
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setText(null);
    setError("");
    if (kind !== "text" || tooLarge) return;
    let active = true;
    fetch(artifactUrl(runId, file.path))
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        return res.text();
      })
      .then((t) => active && setText(t))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [runId, file.path, kind, tooLarge]);

  let body: ReactNode;
  if (tooLarge) body = <PreviewMessage>File is too large to preview ({formatBytes(file.size)}; the preview limit is {formatBytes(PREVIEW_LIMIT)}).</PreviewMessage>;
  else if (kind === "binary") body = <PreviewMessage>Preview is not available for this file type ({formatBytes(file.size)}).</PreviewMessage>;
  else if (error) body = <PreviewMessage>{error}</PreviewMessage>;
  else if (kind === "image") body = <img className="artifact-image" src={artifactUrl(runId, file.path)} alt={file.path} />;
  else body = text == null ? <div className="card__empty">Loading…</div> : <CodeView path={file.path} text={text} />;

  return (
    <div className="artifacts__preview" data-selected={file.path}>
      <div className="artifacts__preview-header">
        <IconFile />
        <span className="artifacts__preview-path">{file.path}</span>
        <span className="table__muted">({formatBytes(file.size)})</span>
      </div>
      <div className="artifacts__preview-body">{body}</div>
    </div>
  );
}

// Model Artifacts tab: MLflow `Run > Artifacts` layout (lazy tree on the left, preview on the right).
export function ArtifactsBrowser({ runId }: { runId: string }) {
  const [children, setChildren] = useState<Record<string, ArtifactFile[]>>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ArtifactFile | null>(null);
  const [error, setError] = useState("");

  const load = (path: string) =>
    getJson<ArtifactFile[]>(`/api/runs/${runId}/artifacts${path ? `?path=${encodeURIComponent(path)}` : ""}`).then((files) => {
      // Folders first, then files, in code point order (as in the MLflow page).
      const sorted = [...files].sort((a, b) => Number(b.isDir) - Number(a.isDir) || (a.path < b.path ? -1 : 1));
      setChildren((c) => ({ ...c, [path]: sorted }));
      return sorted;
    });

  // Opens the first top-level folder and selects its first file, as the MLflow page does.
  useEffect(() => {
    load("")
      .then(async (root) => {
        const dir = root.find((f) => f.isDir);
        if (!dir) return setSelected(root[0] ?? null);
        setOpen(new Set([dir.path]));
        const inner = await load(dir.path);
        setSelected(inner.find((f) => !f.isDir) ?? null);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const toggle = (dir: ArtifactFile) => {
    const next = new Set(open);
    if (next.has(dir.path)) next.delete(dir.path);
    else {
      next.add(dir.path);
      if (!children[dir.path]) load(dir.path).catch((e) => setError(e.message));
    }
    setOpen(next);
  };

  const render = (path: string, depth: number): ReactNode =>
    (children[path] ?? []).map((f) => (
      <div key={f.path}>
        <TreeItem
          name={baseName(f.path)}
          depth={depth}
          isDir={f.isDir}
          expanded={open.has(f.path)}
          selected={selected?.path === f.path}
          onClick={() => (f.isDir ? toggle(f) : setSelected(f))}
        />
        {f.isDir && open.has(f.path) && render(f.path, depth + 1)}
      </div>
    ));

  return (
    <div className="artifacts">
      <div className="artifacts__tree tree" role="tree" data-testid="artifact-tree">
        {error && <div className="form-alert">{error}</div>}
        {render("", 0)}
        {children[""]?.length === 0 && <div className="card__empty">No artifacts recorded.</div>}
      </div>
      {selected ? (
        <ArtifactPreview runId={runId} file={selected} />
      ) : (
        <div className="artifacts__preview">
          <div className="card__empty">Select a file to preview it.</div>
        </div>
      )}
    </div>
  );
}
