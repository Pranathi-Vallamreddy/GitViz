import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createCommit, Repository } from "@gitviz/core";

/**
 * Seeds a small but non-trivial demo repository so the app looks alive on first
 * load and in a fresh deployment. The history deliberately forks into multiple
 * branches and joins back via a real **merge commit** (two parents), so the
 * network graph clearly shows branching and merging. Idempotent: if a repo
 * already exists at `dir`, it's left untouched.
 */
export async function seedDemoRepo(dir: string): Promise<void> {
  if (existsSync(join(dir, ".gitviz", "HEAD"))) return;

  await mkdir(dir, { recursive: true });
  const repo = await Repository.init(dir);
  const author = { name: "Pranathi", email: "p@example.com" };

  let clock = Date.UTC(2024, 0, 2, 9, 0, 0);
  const tick = (): number => (clock += 3_600_000);
  const write = async (rel: string, content: string): Promise<void> => {
    const full = join(dir, rel);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content);
  };

  // --- main: initial line of work ---
  await write("README.md", "# GitViz\n\nA Git-inspired version control system.\n");
  const c1 = await repo.commit("Initial commit", author, tick());
  await write("src/store.ts", "export const store = {};\n");
  const c2 = await repo.commit("Add content-addressable object store", author, tick());
  await write("src/refs.ts", "export const refs = {};\n");
  const c3 = await repo.commit("Add refs and HEAD", author, tick());

  // --- feature/graph-api: forks off the first commit ---
  await repo.refs.setBranch("feature/graph-api", c1);
  await repo.checkout("feature/graph-api");
  await write(
    "src/graph.ts",
    "export const graph = () => ({ commits: [], refs: [] });\n",
  );
  await repo.commit("Sketch graph read model", author, tick());
  await write("src/layout.ts", "export const layout = () => [];\n");
  const featureTip = await repo.commit("Add custom DAG layout engine", author, tick());

  // --- fix/store-edge-case: a short side branch off c2, left unmerged ---
  await repo.refs.setBranch("fix/store-edge-case", c2);
  await repo.checkout("fix/store-edge-case");
  await write("src/store.ts", "export const store = { dedup: true };\n");
  await repo.commit("Fix dedup edge case in store", author, tick());

  // --- merge feature/graph-api back into main (a two-parent commit) ---
  await repo.checkout("main");
  await write(
    "src/graph.ts",
    "export const graph = () => ({ commits: [], refs: [] });\n",
  );
  await write("src/layout.ts", "export const layout = () => [];\n");
  const mergeTree = await repo.writeTree();
  const merge = await repo.objects.put(
    createCommit({
      tree: mergeTree,
      parents: [c3, featureTip],
      author,
      timestamp: tick(),
      message: "Merge feature/graph-api into main",
    }),
  );
  await repo.refs.setBranch("main", merge);

  // --- main continues after the merge ---
  await write("docs/architecture.md", "# Architecture\n\nMonorepo: core, server, web.\n");
  await repo.commit("Document architecture", author, tick());
}
