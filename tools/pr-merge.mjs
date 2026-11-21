import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const descriptionFile = readDescriptionFile(process.argv.slice(2));
const description = readFileSync(descriptionFile, "utf8");
validateDescription(description);

const branch = git(["branch", "--show-current"]).trim();
if (!branch) fail("This command needs a checked-out branch; detached HEAD is not supported.");

const base = run("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], { captureOutput: true }).trim();
if (!base) fail("Could not determine the repository's default branch.");
if (branch === base) fail(`Refusing to publish or merge the default branch (${base}).`);

if (git(["status", "--porcelain"]).trim()) {
  fail("Commit or discard working-tree changes before creating a PR.");
}

run("git", ["push", "--set-upstream", "origin", branch]);
run("gh", [
  "pr", "create",
  "--base", base,
  "--head", branch,
  "--fill",
  "--body-file", descriptionFile,
]);
run("gh", ["pr", "checks", "--watch"]);
run("gh", ["pr", "merge", "--squash", "--delete-branch"]);

function readDescriptionFile(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log("Usage: npm run pr:merge -- --body-file <markdown-file>");
    console.log("The description must include Review scope, Results, and Remaining gaps sections.");
    process.exit(0);
  }

  if (args.length !== 2 || !["--body-file", "-f"].includes(args[0]) || !args[1]) {
    fail("Usage: npm run pr:merge -- --body-file <markdown-file>");
  }

  const file = path.resolve(process.cwd(), args[1]);
  try {
    readFileSync(file, "utf8");
    return file;
  } catch {
    fail(`Could not read PR description file: ${file}`);
  }
}

function validateDescription(body) {
  if (!body.trim()) fail("PR description must not be empty.");

  for (const heading of ["Review scope", "Results", "Remaining gaps"]) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^#{1,6}\\s+${escaped}\\s*$([\\s\\S]*?)(?=^#{1,6}\\s|$)`, "im");
    const section = body.match(pattern)?.[1].trim();
    if (!section) {
      fail(`PR description must include a non-empty "${heading}" section.`);
    }
  }
}

function git(args) {
  return run("git", args, { captureOutput: true });
}

function run(command, args, { captureOutput = false } = {}) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: captureOutput ? ["inherit", "pipe", "inherit"] : "inherit",
    });
  } catch (error) {
    if (error.status !== undefined) process.exit(error.status);
    fail(`Could not run ${command}: ${error.message}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
