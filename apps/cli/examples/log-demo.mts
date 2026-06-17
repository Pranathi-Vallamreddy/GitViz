/**
 * Demonstrates writeTree + commit + log via the Repository façade.
 *
 * Run from the repo root:
 *   pnpm --filter @gitviz/cli exec tsx --conditions development examples/log-demo.mts
 *
 * Builds a small project in a temp working directory, commits it three times,
 * and prints the history walked from HEAD.
 */
import { mkdtempSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { Repository } from "@gitviz/core";

const author = { name: "Pranathi", email: "p@example.com" };
const workdir = mkdtempSync(join(tmpdir(), "gitviz-log-demo-"));
const repo = await Repository.init(workdir);
console.log(`repo: ${workdir}\n`);

/** Writes a file (creating parent directories) relative to the working dir. */
async function write(rel: string, contents: string): Promise<void> {
  const full = join(workdir, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents);
}

await write("README.md", "# My Project\n");
await write("src/app.ts", "export const x = 1;\n");
await write("src/util/math.ts", "export const add = (a: number, b: number) => a + b;\n");
const c1 = await repo.commit("Initial project structure", author, 1_700_000_000_000);

await write("README.md", "# My Project\n\nNow with docs.\n");
await write("src/index.ts", "import './app';\n");
const c2 = await repo.commit("Add entrypoint and docs", author, 1_700_000_100_000);

await write("src/app.ts", "export const x = 42;\n");
const c3 = await repo.commit("Bump value", author, 1_700_000_200_000);

console.log(`commits: ${[c1, c2, c3].map((c) => c.slice(0, 10)).join(" -> ")}\n`);

console.log("log (newest first):");
for (const { id, commit } of await repo.log()) {
  console.log(`  ${id.slice(0, 10)}  ${commit.message}`);
  console.log(
    `            parents: [${commit.parents.map((p) => p.slice(0, 10)).join(", ")}]`,
  );
}
