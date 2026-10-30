import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconClose, IconDanger, IconOverflow } from "../shell/icons";
import { deleteJson, type Project } from "../lib/api";

// Confirmation of the removal from the portal catalog (MLflow "Delete Experiment" modal pattern).
function DeleteProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => !busy && onClose();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  const confirm = async () => {
    setBusy(true);
    setError("");
    const { status, data } = await deleteJson<{ error?: string }>(`/api/projects/${encodeURIComponent(project.name)}`);
    setBusy(false);
    if (status >= 400) setError(data.error || `HTTP ${status}`);
    else navigate("/projects", { state: { toast: `Project "${project.name}" was deleted from the DSML Portal catalog.` } });
  };
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
        <div className="modal__header">
          <h2 className="modal__title" id="delete-project-title">
            <IconDanger className="modal__title-icon" />
            Delete project
          </h2>
          <button className="icon-btn modal__close" aria-label="Close" onClick={close}>
            <IconClose />
          </button>
        </div>
        <div className="modal__body">
          <p>
            Project <strong>"{project.name}"</strong> will be removed from the DSML Portal catalog. Workspace and GitHub assets
            (repository, MLflow experiments, registered models, jobs and schemas) are <strong>not</strong> deleted and must be removed
            manually if needed.
          </p>
          <p>
            Creating a new project with the same name fails while the repository <code>{project.repo}</code> exists.
          </p>
          {error && <div className="form-alert form-alert--inline">{error}</div>}
        </div>
        <div className="modal__footer">
          <button className="btn btn--ghost" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button className="btn btn--danger" disabled={busy} onClick={confirm}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Overflow ("3 dots") menu of the Details header (MLflow experiment page pattern).
export function ProjectMenu({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // Opens from the left edge of the trigger (MLflow); flips to the right edge when it would leave the viewport.
  const menuRef = useRef<HTMLUListElement>(null);
  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!open || !ref.current || !menuRef.current) return;
    setAlignRight(ref.current.getBoundingClientRect().left + menuRef.current.offsetWidth > document.documentElement.clientWidth);
  }, [open]);
  const creating = project.status === "creating";
  return (
    <div className="dropdown" ref={ref}>
      <button
        className={`icon-btn${open ? " icon-btn--open" : ""}`}
        aria-label="Open header dropdown menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconOverflow />
      </button>
      {open && (
        <ul className={`dropdown__menu${alignRight ? " dropdown__menu--right" : ""}`} role="menu" ref={menuRef}>
          <li
            role="menuitem"
            className={`dropdown__item${creating ? " dropdown__item--disabled" : ""}`}
            aria-disabled={creating}
            data-testid="delete"
            onClick={() => {
              if (creating) return;
              setOpen(false);
              setConfirming(true);
            }}
          >
            Delete
            {creating && (
              <span className="dropdown__tooltip" role="tooltip">
                The project is being created and cannot be deleted yet
              </span>
            )}
          </li>
        </ul>
      )}
      {confirming && <DeleteProjectModal project={project} onClose={() => setConfirming(false)} />}
    </div>
  );
}
