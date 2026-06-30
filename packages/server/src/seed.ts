import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Repository } from "@gitviz/core";

/**
 * Seeds a small but non-trivial demo repository (a branch that forks and a
 * separate line of work on `main`) so the app looks alive on first load and in a
 * fresh deployment. Idempotent: if a repo already exists at `dir`, it's left
 * untouched.
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

  await write("README.md", "# GitViz\n\nA Git-inspired version control system.\n");
  const root = await repo.commit("Initial commit", author, tick());
  await write("src/store.ts", "export const store = {};\n");
  await repo.commit("Add content-addressable object store", author, tick());
  await write("src/refs.ts", "export const refs = {};\n");
  await repo.commit("Add refs and HEAD", author, tick());

  // A feature branch that forks off the first commit.
  await repo.refs.setBranch("feature/graph-api", root);
  await repo.checkout("feature/graph-api");
  await write(
    "src/graph.ts",
    "export const graph = () => ({ commits: [], refs: [] });\n",
  );
  await repo.commit("Sketch graph read model", author, tick());
  await write("src/layout.ts", "export const layout = () => [];\n");
  await repo.commit("Add custom DAG layout engine", author, tick());

  // Continue work on main.
  await repo.checkout("main");
  await write("docs/architecture.md", "# Architecture\n\nMonorepo: core, server, web.\n");
  await repo.commit("Document architecture", author, tick());
}
