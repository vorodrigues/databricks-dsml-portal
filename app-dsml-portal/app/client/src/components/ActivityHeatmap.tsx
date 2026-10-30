import { useState } from "react";
import type { Activity } from "../lib/api";

// GitHub-style activity heatmap: 52 week columns x 7 weekday rows (Sunday first),
// intensity by commit count, tooltip with date and count.

const LEVELS = 4;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" });

// Intensity level 0-4 relative to the busiest day.
const level = (count: number, max: number) => (count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * LEVELS)));

export function ActivityHeatmap({ activity }: { activity: Activity }) {
  const [hover, setHover] = useState<{ date: string; count: number; x: number; y: number; end: boolean } | null>(null);
  const counts = activity.days.map((d) => d.count ?? 0);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const weeks = Array.from({ length: activity.days.length / 7 }, (_, w) => activity.days.slice(w * 7, w * 7 + 7));

  return (
    <div className="heatmap">
      <div className="heatmap__summary">
        {total} commit{total === 1 ? "" : "s"} on main in the last 52 weeks
      </div>
      <div className="heatmap__body">
        <div className="heatmap__weekdays">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div>
          <div className="heatmap__months">
            {weeks.map((week, w) => {
              const first = week.find((d) => d.date.endsWith("-01"));
              return <span key={w}>{first ? MONTHS[Number(first.date.slice(5, 7)) - 1] : ""}</span>;
            })}
          </div>
          <div className="heatmap__grid" onMouseLeave={() => setHover(null)}>
            {activity.days.map((d) => (
              <span
                key={d.date}
                className={`heatmap__cell${d.count === null ? " heatmap__cell--future" : ` heatmap__cell--l${level(d.count, max)}`}`}
                data-date={d.date}
                data-count={d.count ?? undefined}
                aria-label={d.count === null ? undefined : `${d.count} commits on ${longDate(d.date)}`}
                onMouseEnter={(e) => {
                  if (d.count === null) return setHover(null);
                  const cell = e.currentTarget.getBoundingClientRect();
                  const grid = e.currentTarget.parentElement!.getBoundingClientRect();
                  const x = cell.left - grid.left + cell.width / 2;
                  // Near the right edge the tooltip ends at the cell instead of centering on it
                  setHover({ date: d.date, count: d.count, x, y: cell.top - grid.top, end: x > grid.width - 100 });
                }}
              />
            ))}
            {hover && (
              <div className={`heatmap__tooltip${hover.end ? " heatmap__tooltip--end" : ""}`} role="tooltip" style={{ left: hover.x, top: hover.y }}>
                <strong>
                  {hover.count} commit{hover.count === 1 ? "" : "s"}
                </strong>{" "}
                on {longDate(hover.date)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="heatmap__legend">
        Less
        {Array.from({ length: LEVELS + 1 }, (_, l) => (
          <span key={l} className={`heatmap__cell heatmap__cell--l${l}`} />
        ))}
        More
      </div>
    </div>
  );
}
