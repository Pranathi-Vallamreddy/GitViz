/**
 * Demonstrates the filesystem-backed content-addressable object store.
 *
 * Run from the repo root:
 *   pnpm --filter @gitviz/cli exec tsx --conditions development examples/store-demo.mts
 *
 * It creates a real `.gitviz/` directory (inside apps/cli/) so you can inspect
 * the generated files on disk. `.gitviz/` is gitignored.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { FileSystemObjectStore, computeObjectId, createBlob } from "@gitviz/core";

const gitvizDir = resolve(process.cwd(), ".gitviz");
const objectsDir = resolve(gitvizDir, "objects");
const store = new FileSystemObjectStore(gitvizDir);

/** Counts every file under a directory tree. */
const countFiles = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(resolve(dir, e.name)) : 1),
    0,
  );

console.log(`Object store: ${objectsDir}\n`);

// 1 + 2. Create a blob and store it.
const blob = createBlob("hello world\n");
const id = await store.put(blob);
console.log(`1/2  stored blob -> ${id}`);
console.log(`      on disk:    objects/${id.slice(0, 2)}/${id.slice(2)}\n`);

// 3. Retrieve it and confirm it round-trips.
const restored = await store.get(id);
console.log(`3    retrieved:   ${JSON.stringify(restored.data.toString())}`);
console.log(`      identical?   ${computeObjectId(restored) === id}\n`);

// 4. Show how many object files exist so far.
console.log(`4    files under objects/: ${countFiles(objectsDir)}\n`);

// 5. Deduplication: store the SAME content again -> same id, no new file.
const idAgain = await store.put(createBlob("hello world\n"));
console.log(`5    stored same content again -> ${idAgain}`);
console.log(`      same id?               ${id === idAgain}`);
console.log(`      files under objects/:  ${countFiles(objectsDir)}  (still 1)\n`);

// For contrast: DIFFERENT content -> a second object file.
const other = await store.put(createBlob("a different file\n"));
console.log(`     stored different content -> ${other}`);
console.log(`      files under objects/:  ${countFiles(objectsDir)}  (now 2)`);
