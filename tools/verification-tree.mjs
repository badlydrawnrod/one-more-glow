import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use the real index's tracked paths (including staged additions), then read
// their working copies. Building a separate index leaves the user's staging alone.
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trimEnd();
const entries = execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: root });
const temporary = mkdtempSync(join(tmpdir(), "omg-verification-"));
const options = {
  cwd: root,
  env: { ...process.env, GIT_INDEX_FILE: join(temporary, "index") },
};

try {
  execFileSync("git", ["update-index", "-z", "--index-info"], { ...options, input: entries });
  execFileSync("git", ["add", "--all"], options);
  process.stdout.write(execFileSync("git", ["write-tree"], options));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
