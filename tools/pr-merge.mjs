import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const description = readDescription(process.argv.slice(2));
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
  "--body", description,
]);
run("gh", ["pr", "checks", "--watch"]);
run("gh", ["pr", "merge", "--squash", "--delete-branch"]);

function readDescription(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log("Usage: npm run pr:merge [-- --body-file <markdown-file>]");
    console.log("Without --body-file, the PR description is read from stdin.");
    console.log("The description must include non-empty Summary and Verification sections.");
    process.exit(0);
  }

  if (args.length === 0) return readFileSync(0, "utf8");

  if (args.length !== 2 || !["--body-file", "-f"].includes(args[0]) || !args[1]) {
    fail("Usage: npm run pr:merge [-- --body-file <markdown-file>] (otherwise provide the description on stdin)");
  }

  const file = path.resolve(process.cwd(), args[1]);
  try {
    return readFileSync(file, "utf8");
  } catch {
    fail(`Could not read PR description file: ${file}`);
  }
}

function validateDescription(body) {
  if (!body.trim()) fail("PR description must not be empty.");

  const lines = body.split(/\r?\n/);
  for (const heading of ["Summary", "Verification"]) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^#{1,6}\\s+${escaped}\\s*$`, "i");
    const start = lines.findIndex((line) => pattern.test(line));
    let end = start + 1;
    while (end < lines.length && !/^#{1,6}\s+/.test(lines[end])) end += 1;
    const section = start < 0 ? "" : lines.slice(start + 1, end).join("\n").trim();
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
