import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { getJson, postJson, type ApiError, type GithubOwner, type TemplateInfo } from "../lib/api";

// Form that creates a project: GitHub repository + bundle rendered from a project template.
// Layout of the workspace "Create new compute" page: title on top, stacked sections, Summary on the right.

const TEMPLATES = ["Classification"];
const NAME_PATTERN = /^[a-z][a-z0-9-]{2,49}$/;
const REPO_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;

type Option = { value: string; label: string };
type Visibility = "private" | "public";

// Bundle parameters picked from workspace objects (listed with the user's permissions).
const LISTS = {
  catalog: "/api/workspace/catalogs",
  online_store: "/api/workspace/online-stores",
  service_principal: "/api/workspace/service-principals",
  viewers_group: "/api/workspace/groups",
} as const;
const SCHEMA_PARAMS = ["schema_dev", "schema_staging", "schema_prod"];
// Set by the portal: the dev run_as is always the signed-in user.
const HIDDEN_PARAMS = ["dev_user"];

// Defaults that follow the project name (and the dev user) until the field is edited;
// with no name yet they are shown as placeholders.
function derivedDefaults(name: string, devUser: string): Record<string, string> {
  return {
    bundle_name: name.replace(/-/g, "_"),
    root_path_dev: `/Workspace/Users/${devUser}/${name}/dev`,
    root_path_staging: `/Workspace/${name}/staging`,
    root_path_prod: `/Workspace/${name}/prod`,
  };
}

function useOptions(path: string | null, toOption: (item: Record<string, string>) => Option) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!path) return;
    let active = true;
    setOptions(null);
    setError("");
    getJson<Record<string, string>[]>(path)
      .then((items) => active && setOptions(items.map(toOption)))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return { options, error };
}

const PLACEHOLDERS = derivedDefaults("<project_name>", "<dev_user>");

const byName = (i: Record<string, string>) => ({ value: i.name, label: i.name });

// Line-break opportunities after '.' and '@' for long identifiers in the narrow Summary.
const breakable = (text: string) =>
  text.split(/(?<=[.@])/).flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part]));

export function CreateProjectPage() {
  useDocumentTitle("Create new project");
  const navigate = useNavigate();

  const [owner, setOwner] = useState<GithubOwner | null>(null);
  const [tpl, setTpl] = useState<TemplateInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    getJson<GithubOwner>("/api/github/owner").then(setOwner).catch((e) => setLoadError(e.message));
    getJson<TemplateInfo>("/api/templates/Classification").then(setTpl).catch((e) => setLoadError(e.message));
  }, []);

  const [name, setName] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  // Values typed by the user; every other field shows its (derived) default.
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const repoName = edited["repository.name"] ?? name;
  const params = useMemo(() => {
    if (!tpl) return {} as Record<string, string>;
    const devUser = tpl.defaults.dev_user;
    const derived = name ? derivedDefaults(name, devUser) : Object.fromEntries(Object.keys(PLACEHOLDERS).map((k) => [k, ""]));
    const values: Record<string, string> = { ...tpl.defaults, dev_user: devUser, ...derived };
    for (const [key, value] of Object.entries(edited)) if (key.startsWith("params.")) values[key.slice(7)] = value;
    return values;
  }, [tpl, name, edited]);

  const lists = {
    catalog: useOptions(LISTS.catalog, byName),
    online_store: useOptions(LISTS.online_store, byName),
    service_principal: useOptions(LISTS.service_principal, (i) => ({ value: i.applicationId, label: i.name })),
    viewers_group: useOptions(LISTS.viewers_group, byName),
  };
  // Schemas of the selected catalog, reloaded when the catalog changes.
  const schemas = useOptions(
    params.catalog ? `/api/workspace/schemas?catalog=${encodeURIComponent(params.catalog)}` : null,
    byName
  );
  const optionsOf = (key: string) =>
    SCHEMA_PARAMS.includes(key) ? schemas : key in lists ? lists[key as keyof typeof lists] : null;

  // Client-side validation (the backend validates again).
  const clientErrors = (() => {
    const errors: Record<string, string> = {};
    if (!NAME_PATTERN.test(name))
      errors.name = "Required: 3-50 characters, lowercase letters, digits and hyphens, starting with a letter";
    if (!REPO_PATTERN.test(repoName)) errors["repository.name"] = "Use up to 100 letters, digits, '.', '-' or '_'";
    if (/[\r\n]/.test(description) || description.length > 350)
      errors["repository.description"] = "Single line, up to 350 characters";
    if (!tpl) return errors;
    for (const [key, prop] of Object.entries(tpl.properties)) {
      const value = params[key] ?? "";
      const options = optionsOf(key)?.options;
      if (!value.trim()) errors[`params.${key}`] = "Required";
      else if (value !== value.trim()) errors[`params.${key}`] = "Must not start or end with spaces";
      else if (prop.pattern && !new RegExp(prop.pattern).test(value))
        errors[`params.${key}`] = prop.pattern_match_failure_message || `Must match ${prop.pattern}`;
      else if (options && !options.some((o) => o.value === value))
        errors[`params.${key}`] = SCHEMA_PARAMS.includes(key)
          ? `Not available in catalog ${params.catalog}`
          : "Not available in the workspace";
    }
    return errors;
  })();

  const errorOf = (key: string) =>
    serverErrors[key] || ((submitted || touched.has(key)) && clientErrors[key]) || "";

  const change = (key: string, value: string) => {
    // A new catalog revalidates the schemas right away.
    const keys = key === "params.catalog" ? [key, ...SCHEMA_PARAMS.map((k) => `params.${k}`)] : [key];
    setTouched((t) => new Set([...t, ...keys]));
    setServerErrors(({ [key]: _, ...rest }) => rest);
    if (key === "name") setName(value);
    else if (key === "repository.description") setDescription(value);
    else setEdited((e) => ({ ...e, [key]: value }));
  };

  const cancel = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/projects"));

  const create = async () => {
    setSubmitted(true);
    setSubmitError("");
    if (Object.keys(clientErrors).length) {
      document.querySelector<HTMLElement>(".field--error input, .field--error select")?.focus();
      return;
    }
    setSubmitting(true);
    const { status, data } = await postJson<ApiError>("/api/projects", {
      name,
      template,
      repository: { name: repoName, description, visibility },
      params,
    }).catch((e) => ({ status: 0, data: { error: e.message } as ApiError }));
    setSubmitting(false);
    if (status === 202) return navigate(`/projects/${name}`);
    if (status === 400 && data.fields) setServerErrors(data.fields);
    else if (status === 409)
      setServerErrors({ [/^Repository/.test(data.error || "") ? "repository.name" : "name"]: data.error || "Already exists" });
    else setSubmitError(data.error || `Request failed (HTTP ${status})`);
  };

  const ready = !!(owner && tpl);
  const sp = lists.service_principal.options?.find((o) => o.value === params.service_principal);
  const bundleKeys = tpl
    ? Object.entries(tpl.properties).filter(([key]) => !HIDDEN_PARAMS.includes(key)).sort((a, b) => a[1].order - b[1].order)
    : [];

  return (
    <div className="create-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/projects" className="breadcrumb__link">Projects</Link>
        <span className="breadcrumb__sep">›</span>
        <span>New project</span>
      </nav>
      <h2 className="create-page__title">Create new project</h2>
      {loadError && <div className="form-alert">{loadError}</div>}

      <div className="create-layout">
        <form id="create-project" className="create-form" onSubmit={(e) => (e.preventDefault(), create())} noValidate>
          <Section title="General">
            <Field label="Project name" id="name" error={errorOf("name")} hint="Lowercase letters, digits and hyphens.">
              <input id="name" className="input" value={name} autoFocus placeholder="my-ml-project"
                onChange={(e) => change("name", e.target.value)} />
            </Field>
          </Section>

          <Section title="Repository">
            <Field label="Owner" id="owner" hint="GitHub account of the portal credential.">
              <input id="owner" className="input input--readonly" value={owner?.login ?? ""} readOnly
                placeholder={owner ? "" : "Loading..."} />
            </Field>
            <Field label="Repository name" id="repository.name" error={errorOf("repository.name")}>
              <input id="repository.name" className="input" value={repoName}
                onChange={(e) => change("repository.name", e.target.value)} />
            </Field>
            <Field label="Description" id="repository.description" error={errorOf("repository.description")} optional>
              <input id="repository.description" className="input input--wide" value={description}
                onChange={(e) => change("repository.description", e.target.value)} />
            </Field>
            <Field label="Visibility" id="repository.visibility" error={errorOf("repository.visibility")}>
              <div className="radio-group" role="radiogroup" id="repository.visibility">
                {(["private", "public"] as const).map((v) => (
                  <label key={v} className="radio">
                    <input type="radio" name="visibility" value={v} checked={visibility === v}
                      onChange={() => setVisibility(v)} />
                    {v === "private" ? "Private" : "Public"}
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Project template">
            <Field label="Template" id="template" error={errorOf("template")} hint={tpl?.description}>
              <Select id="template" value={template} onChange={setTemplate}
                options={TEMPLATES.map((t) => ({ value: t, label: t }))} />
            </Field>
          </Section>

          <Section title="Bundle">
            {!tpl && <div className="field__hint">Loading template parameters...</div>}
            {bundleKeys.map(([key, prop]) => {
              const id = `params.${key}`;
              const list = optionsOf(key);
              return (
                <Field key={key} label={prop.description} code={key} id={id} error={errorOf(id) || list?.error}>
                  {list ? (
                    <Select id={id} value={params[key] ?? ""} options={list.options}
                      onChange={(v) => change(id, v)} />
                  ) : (
                    <input id={id} className="input input--wide" value={params[key] ?? ""}
                      placeholder={PLACEHOLDERS[key]} onChange={(e) => change(id, e.target.value)} />
                  )}
                </Field>
              );
            })}
          </Section>

        </form>

        <aside className="summary" aria-label="Summary">
          <SummaryItem title="Summary">
            <span>{owner ? `${owner.login}/${repoName || "<repository>"}` : "..."}</span>
            <span>{visibility === "private" ? "Private" : "Public"} repository</span>
          </SummaryItem>
          <SummaryItem title="Template">
            <span className="tag">{template}</span>
          </SummaryItem>
          {tpl && (
            <>
              <SummaryItem title="Unity Catalog">
                <span>Catalog: {params.catalog}</span>
                {(["dev", "staging", "prod"] as const).map((t) => (
                  <span key={t}>{t}: {params[`schema_${t}`]}</span>
                ))}
              </SummaryItem>
              <SummaryItem title="Production model">
                <span>{breakable(`${params.catalog}.${params.schema_prod}.${params.model_name}`)}</span>
              </SummaryItem>
              <SummaryItem title="Run as">
                <span>dev: {breakable(params.dev_user)}</span>
                <span>staging, prod: {sp?.label ?? params.service_principal}</span>
              </SummaryItem>
            </>
          )}
        </aside>
      </div>
      <div className="form-footer">
        {submitError && <div className="form-alert form-alert--inline">{submitError}</div>}
        <button type="submit" form="create-project" className="btn btn--primary" disabled={!ready || submitting}>
          {submitting ? "Creating..." : "Create"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3 className="form-section__title">{title}</h3>
      <div className="form-section__fields">{children}</div>
    </section>
  );
}

function Field(props: {
  label: string;
  id: string;
  code?: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field${props.error ? " field--error" : ""}`}>
      <label className="field__label" htmlFor={props.id}>
        {props.label}
        {props.code && <code className="field__code">{props.code}</code>}
        {props.optional && <span className="field__optional">(optional)</span>}
      </label>
      {props.children}
      {props.error ? (
        <div className="field__error" role="alert">{props.error}</div>
      ) : (
        props.hint && <div className="field__hint">{props.hint}</div>
      )}
    </div>
  );
}

// Native select styled as the workspace combobox; a value missing from the options stays visible.
function Select({ id, value, options, onChange }: {
  id: string;
  value: string;
  options: Option[] | null;
  onChange: (value: string) => void;
}) {
  const missing = options && value && !options.some((o) => o.value === value);
  return (
    <select id={id} className="input select" value={value} disabled={!options}
      onChange={(e) => onChange(e.target.value)}>
      {!options && <option value={value}>{value ? `${value} (loading...)` : "Loading..."}</option>}
      {options && !value && <option value="">Select...</option>}
      {missing && <option value={value}>{value} (not available)</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function SummaryItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="summary__item">
      <div className="summary__title">{title}</div>
      <div className="summary__values">{children}</div>
    </div>
  );
}
