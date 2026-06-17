/**
 * Demonstrates Git-style refs and HEAD on top of the object store.
 *
 * Run from the repo root:
 *   pnpm --filter @gitviz/cli exec tsx --conditions development examples/refs-demo.mts
 *
 * Creates a real `.gitviz/` directory (inside apps/cli/, which is gitignored) so
 * you can inspect HEAD and refs/heads/* on disk.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FileSystemObjectStore,
  FileSystemRefStore,
  createBlob,
  createCommit,
  createTree,
} from "@gitviz/core";

const gitvizDir = resolve(process.cwd(), ".gitviz");
const objects = new FileSystemObjectStore(gitvizDir);
const refs = new FileSystemRefStore(gitvizDir);

/** Tiny helper: write a one-file tree + commit, return the commit id. */
async function commit(message: string, parents: string[]): Promise<string> {
  const blobId = await objects.put(createBlob(`${message}\n`));
  const treeId = await objects.put(
    createTree([{ name: "file.txt", type: "blob", hash: blobId }]),
  );
  const commitId = await objects.put(
    createCommit({
      tree: treeId,
      parents,
      author: { name: "Pranathi", email: "p@example.com" },
      timestamp: Date.now(),
      message,
    }),
  );
  return commitId;
}

console.log(`repo: ${gitvizDir}\n`);

// 1. Point HEAD at an (unborn) main branch — exactly what `init` does.
await refs.setHeadToBranch("main");
console.log("1  HEAD -> refs/heads/main (branch not yet born)");
console.log(`     current branch: ${await refs.currentBranch()}`);
console.log(`     resolveHead():  ${await refs.resolveHead()}  (unborn)\n`);

// 2. First commit, then move main to it.
const c1 = await commit("first commit", []);
await refs.setBranch("main", c1);
console.log(`2  committed ${c1.slice(0, 10)} and set main -> it`);
console.log(`     resolveHead(): ${(await refs.resolveHead())?.slice(0, 10)}\n`);

// 3. Second commit advances main (HEAD follows automatically — it's symbolic).
const c2 = await commit("second commit", [c1]);
await refs.setBranch("main", c2);
console.log(`3  committed ${c2.slice(0, 10)} and advanced main`);
console.log(
  `     resolveHead(): ${(await refs.resolveHead())?.slice(0, 10)}  (HEAD followed)\n`,
);

// 4. Create a feature branch off the current commit and switch HEAD to it.
const head = await refs.resolveHead();
await refs.setBranch("feature", head!);
await refs.setHeadToBranch("feature");
console.log("4  created 'feature' off HEAD and switched to it");
console.log(`     branches:       ${(await refs.listBranches()).join(", ")}`);
console.log(`     current branch: ${await refs.currentBranch()}\n`);

// 5. Detached HEAD: point straight at the first commit.
await refs.setHeadDetached(c1);
console.log("5  detached HEAD onto the first commit");
console.log(`     current branch: ${await refs.currentBranch()}  (none = detached)`);
console.log(`     resolveHead():  ${(await refs.resolveHead())?.slice(0, 10)}\n`);

// 6. Show the raw on-disk files.
console.log("6  on disk:");
console.log(
  `     HEAD             -> ${readFileSync(resolve(gitvizDir, "HEAD"), "utf8").trim()}`,
);
console.log(
  `     refs/heads/main  -> ${readFileSync(resolve(gitvizDir, "refs/heads/main"), "utf8").trim()}`,
);
