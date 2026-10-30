import { useState, type ReactNode } from "react";
import { IconChevronDown, IconWarning } from "../shell/icons";

const SUMMARY_NAMES = 3;

// Alerts at the top of a page: a single alert is shown as is; two or more collapse into a summary
// line (`X alerts: a, b, c +N more`) that expands to one line per alert. The state is not persisted.
export function AlertGroup({
  alerts,
  names,
  defaultExpanded = false,
}: {
  alerts: ReactNode[];
  // Names listed in the summary (duplicates are shown once).
  names: string[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (alerts.length === 0) return null;
  if (alerts.length === 1) return <div className="alerts">{alerts}</div>;
  const unique = [...new Set(names)];
  const more = unique.length - SUMMARY_NAMES;
  return (
    <div className="alerts">
      <button
        className="alert alert--warning alert--summary"
        aria-expanded={expanded}
        data-testid="alerts-summary"
        onClick={() => setExpanded((e) => !e)}
      >
        <IconWarning className="alert__icon" />
        <span>
          <strong>{alerts.length} alerts:</strong> {unique.slice(0, SUMMARY_NAMES).join(", ")}
          {more > 0 && <span className="table__muted"> +{more} more</span>}
        </span>
        <IconChevronDown className={`alert__chevron${expanded ? " alert__chevron--open" : ""}`} />
      </button>
      {expanded && alerts}
    </div>
  );
}
