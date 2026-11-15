import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appsDirectory = path.join(root, "apps");
const violations = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(filePath));
    } else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(filePath);
    }
  }

  return files;
}

function moduleSpecifiers(source) {
  const specifiers = [];
  const pattern = /\b(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

for (const appEntry of await readdir(appsDirectory, { withFileTypes: true })) {
  if (!appEntry.isDirectory()) continue;
  const appRoot = path.join(appsDirectory, appEntry.name);

  for (const filePath of await sourceFiles(appRoot)) {
    const source = await readFile(filePath, "utf8");
    for (const specifier of moduleSpecifiers(source)) {
      const resolved = path.resolve(path.dirname(filePath), specifier);
      if (specifier.startsWith("one-more-glow/")) {
        violations.push(`${filePath}: import "${specifier}"; use the public package entry point "one-more-glow"`);
      } else if (resolved.startsWith(path.join(root, "packages", "one-more-glow") + path.sep)) {
        violations.push(`${filePath}: import "${specifier}"; apps must use the one-more-glow package entry point`);
      } else if (resolved.startsWith(path.join(root, "apps") + path.sep) && !resolved.startsWith(appRoot + path.sep)) {
        violations.push(`${filePath}: import "${specifier}"; apps must not depend on another app`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.map((violation) => `- ${path.relative(root, violation.split(":")[0])}: ${violation.slice(violation.indexOf(":") + 2)}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("App import boundaries are valid.");
}
