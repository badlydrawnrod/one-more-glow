import { readFile, readdir } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const skillsIndex = await readFile("docs/skills.md", "utf8");
const errors = [];

if (!/\]\(docs\/skills\.md\)/.test(readme)) {
  errors.push('README.md must link to the human-readable skills catalog at "docs/skills.md".');
}

const skillEntries = (await readdir(".agents/skills", { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of skillEntries) {
  const skillFile = `.agents/skills/${name}/SKILL.md`;
  try {
    await readFile(skillFile, "utf8");
  } catch {
    continue;
  }
  const catalogLink = `../${skillFile}`;
  if (!skillsIndex.includes(`[${name}](${catalogLink})`)) {
    errors.push(`Skill "${name}" is missing from docs/skills.md.`);
  }
}

for (const match of skillsIndex.matchAll(/\[[\w-]+\]\((\.\.\/.agents\/skills\/[^)]+\/SKILL\.md)\)/g)) {
  const target = match[1].replace(/^\.\.\//, "");
  try {
    await readFile(target, "utf8");
  } catch {
    errors.push(`Skills catalog links to missing skill file "${target}".`);
  }
}

const documentedCommands = new Set();
for (const match of readme.matchAll(/`(npm (?:run [\w:-]+|test))([^`]*)`/g)) {
  const command = match[1];
  if (match[2].includes("--workspace")) continue;
  const normalized = command === "npm test" ? "run test" : command.slice("npm ".length);
  documentedCommands.add(normalized);
}

for (const [name, command] of Object.entries(packageJson.scripts)) {
  const normalized = name === "test" ? "run test" : `run ${name}`;
  if (!documentedCommands.has(normalized)) {
    errors.push(`Root command "npm ${normalized}" is missing from the README workspace commands table.`);
  }
}

for (const match of readme.matchAll(/`npm (run [\w:-]+|test)([^`]*)`/g)) {
  const command = match[1];
  if (match[2].includes("--workspace")) continue;
  const normalized = command === "test" ? "run test" : command;
  const [kind, name] = normalized.split(" ");
  if (kind === "run" && !(name in packageJson.scripts)) {
    errors.push(`README documents "npm run ${name}", but that root npm command does not exist.`);
  }
}

for (const [name, command] of Object.entries(packageJson.scripts)) {
  if (!name.startsWith("check")) continue;
  for (const [, file] of command.matchAll(/\bnode\s+(?:[^\s]*\s+)*([^\s;&|]+)/g)) {
    if (!file.startsWith("tools/")) {
      errors.push(`Root check command "${name}" runs Node file "${file}"; repository-check code belongs in tools/.`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Repository tool placement, README command list and skills catalog are valid.");
}
