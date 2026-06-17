/**
 * Demonstrates checkout: switching branches and detaching HEAD, with the working
 * directory materialized from the target commit's tree each time.
 *
 * Run from the repo root:
 *   pnpm --filter @gitviz/cli exec tsx --conditions development examples/checkout-demo.mts
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { Repository } from "@gitviz/core";

const author = { name: "Pranathi", email: "p@example.com" };
const workdir = mkdtempSync(join(tmpdir(), "gitviz-checkout-demo-"));
const repo = await Repository.init(workdir);

async function write(rel: string, contents: string): Promise<void> {
  const full = join(workdir, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents);
}

function listing(): string {
  const out: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (prefix === "" && e.name === ".gitviz") continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), rel);
      else out.push(rel);
    }
  };
  walk(workdir, "");
  return out.sort().join(", ") || "(empty)";
}

console.log(`repo: ${workdir}\n`);

// main: two files
await write("README.md", "v1");
await write("only-main.txt", "only on main");
const c1 = await repo.commit("main: initial", author, 1000);
console.log(`main @ ${c1.slice(0, 10)} -> ${listing()}`);

// branch 'feature' off c1, switch to it, diverge
await repo.refs.setBranch("feature", c1);
await repo.checkout("feature");
await write("README.md", "v2");
await write("src/app.ts", "feature code");
const { promises } = await import("node:fs");
await promises.rm(join(workdir, "only-main.txt"));
const c2 = await repo.commit("feature: work", author, 2000);
console.log(`feature @ ${c2.slice(0, 10)} -> ${listing()}`);

// switch back to main: tree restored, src/ pruned, only-main.txt back
await repo.checkout("main");
console.log(`\ncheckout main  -> ${listing()}`);
console.log(`  README.md = "${readFileSync(join(workdir, "README.md"), "utf8")}"`);
console.log(`  current branch: ${await repo.refs.currentBranch()}`);

// switch to feature again
await repo.checkout("feature");
console.log(`\ncheckout feature -> ${listing()}`);
console.log(`  current branch: ${await repo.refs.currentBranch()}`);

// detached HEAD onto the first commit
const detached = await repo.checkout(c1);
console.log(`\ncheckout ${c1.slice(0, 10)} -> ${listing()}`);
console.log(
  `  detached: ${detached.detached}, current branch: ${await repo.refs.currentBranch()}`,
);

rmSync(workdir, { recursive: true, force: true });
