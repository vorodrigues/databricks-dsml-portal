// Builds the deployable app into ./build: the React client (Vite) and the backend bundled
// into one file (esbuild), so the Apps runtime starts it without installing packages.
import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readTemplateDir } from "./server/template.js";

rmSync("build", { recursive: true, force: true });

await viteBuild({ build: { outDir: "../build/client/dist", emptyOutDir: true } });

await esbuild({
  entryPoints: ["server/server.js"],
  outfile: "build/server/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["pg-native"],
  // CommonJS dependencies bundled into ESM need a require function
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});

copyFileSync("app.yaml", "build/app.yaml");
// Project Templates packed as JSON (base64 contents): the workspace would turn `.py` notebooks
// of a plain folder copy into notebook objects without extension.
mkdirSync("build/templates");
for (const name of readdirSync("../templates")) {
  const { schema, files } = readTemplateDir(`../templates/${name}`);
  const packed = files.map((f) => ({ path: f.path, content: f.content.toString("base64") }));
  writeFileSync(`build/templates/${name}.json`, JSON.stringify({ schema, files: packed }));
}
