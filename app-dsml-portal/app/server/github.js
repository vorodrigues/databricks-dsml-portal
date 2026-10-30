// GitHub REST client. Every call uses the single portal credential (GITHUB_TOKEN, from the
// `dsml-portal/github-token` secret).
import { HttpError } from "./workspace.js";
import { sealedBox } from "./sealedbox.js";

const API = "https://api.github.com";

export async function github(path, { method = "GET", body, allow404 = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (allow404 && res.status === 404) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new HttpError(res.status, `GitHub ${method} ${path}: ${data.message || text}`);
  return data;
}

let ownerCache = null;

// Account that owns the token (owner of every new repository).
export async function owner() {
  if (!ownerCache) {
    const user = await github("/user");
    ownerCache = { login: user.login, name: user.name, avatarUrl: user.avatar_url, htmlUrl: user.html_url };
  }
  return ownerCache;
}

// Repository metadata, or null when it does not exist or is not accessible with the token.
export const getRepo = (repo) => github(`/repos/${repo}`, { allow404: true });

export async function openPullsToMain(repo) {
  const pulls = await github(`/repos/${repo}/pulls?state=open&base=main&per_page=100`);
  return pulls.map((p) => ({ number: p.number, title: p.title, url: p.html_url, head: p.head.ref, author: p.user.login }));
}

// New repository whose `main` holds only the auto-generated README.md.
export async function createRepo({ name, description, visibility }) {
  const repo = await github("/user/repos", {
    method: "POST",
    body: { name, description, private: visibility === "private", auto_init: true },
  });
  if (repo.default_branch !== "main") throw new Error(`Default branch of ${repo.full_name} is ${repo.default_branch}, expected main`);
  return repo;
}

// Actions secrets, encrypted with the repository public key (libsodium sealed box).
export async function setActionsSecrets(repo, secrets) {
  const key = await github(`/repos/${repo}/actions/secrets/public-key`);
  for (const [name, value] of Object.entries(secrets)) {
    if (!value) throw new Error(`Value of Actions secret ${name} is empty`);
    await github(`/repos/${repo}/actions/secrets/${name}`, {
      method: "PUT",
      body: { encrypted_value: sealedBox(value, key.key), key_id: key.key_id },
    });
  }
}

// The initial commit may take a moment to be readable right after the repository is created.
async function mainHead(repo) {
  for (let attempt = 1; ; attempt++) {
    try {
      return (await github(`/repos/${repo}/git/ref/heads/main`)).object.sha;
    } catch (e) {
      if (attempt >= 10 || ![404, 409].includes(e.status)) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// Pushes `files` ([{ path, content: Buffer }]) as one commit on a new `branch` on top of `main`
// (Git Data API: blobs -> tree -> commit -> ref). Returns the commit SHA.
export async function pushBranch(repo, branch, files, message) {
  const parent = await mainHead(repo);
  const baseTree = (await github(`/repos/${repo}/git/commits/${parent}`)).tree.sha;
  const tree = [];
  for (const file of files) {
    const blob = await github(`/repos/${repo}/git/blobs`, {
      method: "POST",
      body: { content: file.content.toString("base64"), encoding: "base64" },
    });
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await github(`/repos/${repo}/git/trees`, { method: "POST", body: { base_tree: baseTree, tree } });
  const commit = await github(`/repos/${repo}/git/commits`, {
    method: "POST",
    body: { message, tree: newTree.sha, parents: [parent] },
  });
  await github(`/repos/${repo}/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
  return commit.sha;
}

// Files and folders of `branch` (recursive Git tree), with their GitHub links.
export async function branchTree(repo, branch = "main") {
  const tree = await github(`/repos/${repo}/git/trees/${branch}?recursive=1`, { allow404: true });
  if (!tree) return null;
  const url = (kind, path) => `https://github.com/${repo}/${kind}/${branch}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return {
    truncated: tree.truncated,
    entries: tree.tree
      .filter((e) => e.type === "blob" || e.type === "tree")
      .map((e) => ({ path: e.path, isDir: e.type === "tree", size: e.size ?? null, url: url(e.type === "tree" ? "tree" : "blob", e.path) })),
  };
}

// Open pull request to `main` of the repository, or a 409 when it is no longer pending.
async function pendingPull(repo, number) {
  const pull = await github(`/repos/${repo}/pulls/${number}`, { allow404: true });
  if (!pull) throw new HttpError(404, `Pull request #${number} not found in ${repo}`);
  if (pull.state !== "open" || pull.base.ref !== "main")
    throw new HttpError(409, `Pull request #${number} is not an open pull request to main`);
  return pull;
}

// Approve: merges the pull request into main.
export async function mergePull(repo, number) {
  const pull = await pendingPull(repo, number);
  const res = await github(`/repos/${repo}/pulls/${number}/merge`, {
    method: "PUT",
    body: { merge_method: "merge", commit_title: `Merge pull request #${number} from ${pull.head.ref}` },
  });
  return { number, merged: res.merged, sha: res.sha };
}

// Reject: closes the pull request without merging.
export async function closePull(repo, number) {
  await pendingPull(repo, number);
  const res = await github(`/repos/${repo}/pulls/${number}`, { method: "PATCH", body: { state: "closed" } });
  return { number, state: res.state, merged: res.merged };
}
