import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pagesOutputDirectory, publishedApps } from "./pages-publication.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, pagesOutputDirectory);
const pagesBase = normalizeBase(process.env.PAGES_BASE ?? "/");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "site"), output, { recursive: true });

await runNpm(["run", "build", "--workspace=one-more-glow"]);

for (const app of publishedApps) {
  const appOutput = path.join(root, "apps", app.workspace, "dist");
  const routePath = app.route.replace(/^\/+|\/+$/g, "");
  const destination = path.join(output, routePath);

  await runNpm(
    ["run", "build", `--workspace=${app.workspace}`],
    {
      PAGES_BASE: pagesBase,
      APP_ROUTE: app.route,
      ...(app.defaultScene ? { VITE_DEFAULT_SCENE: app.defaultScene } : {}),
    },
  );

  try {
    await readFile(path.join(appOutput, "index.html"));
  } catch {
    throw new Error(`Build for ${app.workspace} did not produce ${appOutput}/index.html`);
  }
  await stampServiceWorker(appOutput, app.workspace);
  await mkdir(destination, { recursive: true });
  await cp(appOutput, destination, { recursive: true });
}

console.log(`Assembled ${publishedApps.length} apps at ${output} (Pages base ${pagesBase}).`);

function normalizeBase(value) {
  if (!value.startsWith("/") || value.includes("?")) {
    throw new Error(`PAGES_BASE must be a path beginning with /; received ${JSON.stringify(value)}.`);
  }
  return `/${value.split("/").filter(Boolean).join("/")}${value.endsWith("/") ? "" : "/"}`;
}

async function stampServiceWorker(appOutput, workspace) {
  const serviceWorkerPath = path.join(appOutput, "sw.js");
  let serviceWorker;
  try {
    serviceWorker = await readFile(serviceWorkerPath, "utf8");
  } catch {
    throw new Error(`Build for ${workspace} did not produce ${serviceWorkerPath}.`);
  }
  if (!serviceWorker.includes("__BUILD_VERSION__")) {
    throw new Error(`${serviceWorkerPath} must include the __BUILD_VERSION__ cache marker.`);
  }

  const hash = createHash("sha256");
  const files = (await listFiles(appOutput))
    .filter((file) => file !== "sw.js")
    .sort();
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(path.join(appOutput, file)));
  }
  const version = hash.digest("hex").slice(0, 16);
  await writeFile(serviceWorkerPath, serviceWorker.replaceAll("__BUILD_VERSION__", version));
}

async function listFiles(directory, parent = "") {
  const entries = await readdir(path.join(directory, parent), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(parent, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(directory, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

function runNpm(args, extraEnvironment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...extraEnvironment },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} failed (${signal ?? `exit ${code}`}).`));
    });
  });
}
