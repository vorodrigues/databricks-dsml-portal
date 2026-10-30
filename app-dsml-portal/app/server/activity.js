// Activity API: daily count of commits on `main` of the visible projects' repositories,
// over a 52-week grid (weeks start on Sunday; the last week holds today, UTC dates).
import { Router } from "express";
import { github } from "./github.js";
import { listVisibleProjects } from "./projects.js";

const WEEKS = 52;
const DAY = 86400000;
const CACHE_MS = 60000;
let cache = null;

const isoDay = (t) => new Date(t).toISOString().slice(0, 10);

// Commit dates (committer date) on `main` since `since`; empty when the repo or branch has no commits yet.
async function mainCommitDates(repo, since) {
  const dates = [];
  for (let page = 1; ; page++) {
    let commits;
    try {
      commits = await github(`/repos/${repo}/commits?sha=main&since=${since}&per_page=100&page=${page}`);
    } catch (e) {
      if ([404, 409].includes(e.status)) return dates;
      throw e;
    }
    dates.push(...commits.map((c) => c.commit.committer.date));
    if (commits.length < 100) return dates;
  }
}

async function activity() {
  const today = new Date(isoDay(Date.now())).getTime();
  const end = today + (6 - new Date(today).getUTCDay()) * DAY;
  const start = end - (WEEKS * 7 - 1) * DAY;
  const repos = (await listVisibleProjects()).filter((p) => p.visibility).map((p) => p.repo);
  const counts = {};
  for (const dates of await Promise.all(repos.map((r) => mainCommitDates(r, new Date(start).toISOString())))) {
    for (const d of dates) counts[isoDay(d)] = (counts[isoDay(d)] || 0) + 1;
  }
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = isoDay(start + i * DAY);
    return { date, count: start + i * DAY > today ? null : counts[date] || 0 };
  });
  return { start: isoDay(start), end: isoDay(end), today: isoDay(today), repos, days };
}

export function activityRouter(wrap) {
  const router = Router();
  // Short cache: each refresh lists the catalog and pages through the commits of every repository.
  router.get(
    "/activity",
    wrap(async () => {
      if (!cache || Date.now() - cache.at > CACHE_MS) cache = { at: Date.now(), data: await activity() };
      return cache.data;
    })
  );
  return router;
}
