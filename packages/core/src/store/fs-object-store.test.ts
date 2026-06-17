import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { deflate as deflateCb } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CorruptObjectError,
  InvalidObjectIdError,
  ObjectNotFoundError,
} from "../errors.js";
import { hashBytes } from "../hash.js";
import { createBlob } from "../objects/blob.js";
import { createCommit } from "../objects/commit.js";
import { computeObjectId, frameObject, serialize } from "../objects/object.js";
import { createTree } from "../objects/tree.js";
import { FileSystemObjectStore } from "./fs-object-store.js";

const deflate = promisify(deflateCb);

let gitvizDir: string;
let store: FileSystemObjectStore;

beforeEach(async () => {
  gitvizDir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-store-"));
  store = new FileSystemObjectStore(gitvizDir);
});

afterEach(async () => {
  await fs.rm(gitvizDir, { recursive: true, force: true });
});

/** Recursively counts regular files under a directory (0 if it doesn't exist). */
async function countFiles(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await countFiles(full) : 1;
  }
  return total;
}

describe("FileSystemObjectStore", () => {
  it("put returns the content-addressable id", async () => {
    const blob = createBlob("hello");
    expect(await store.put(blob)).toBe(computeObjectId(blob));
  });

  it("has reflects presence", async () => {
    const id = await store.put(createBlob("present"));
    expect(await store.has(id)).toBe(true);
    expect(await store.has(hashBytes(Buffer.from("absent")))).toBe(false);
  });

  it("round-trips a blob, a tree, and a commit", async () => {
    const blob = createBlob("file contents");
    const tree = createTree([
      { name: "a.txt", type: "blob", hash: computeObjectId(blob) },
    ]);
    const commit = createCommit({
      tree: computeObjectId(tree),
      author: { name: "Ada", email: "ada@example.com" },
      timestamp: 1_700_000_000_000,
      message: "Initial commit\n\nWith a body.",
    });

    for (const object of [blob, tree, commit]) {
      const id = await store.put(object);
      expect(await store.get(id)).toEqual(object);
    }
  });

  it("preserves binary content containing NUL bytes", async () => {
    const blob = createBlob(Buffer.from([0, 1, 2, 0, 255, 0, 10]));
    const id = await store.put(blob);
    expect(await store.get(id)).toEqual(blob);
  });

  it("deduplicates identical content (stored exactly once)", async () => {
    const objectsDir = path.join(gitvizDir, "objects");
    const id1 = await store.put(createBlob("same content"));
    const id2 = await store.put(createBlob("same content"));

    expect(id1).toBe(id2);
    expect(await countFiles(objectsDir)).toBe(1);
  });

  it("lays objects out as objects/<aa>/<rest>", async () => {
    const id = await store.put(createBlob("layout"));
    const file = path.join(gitvizDir, "objects", id.slice(0, 2), id.slice(2));
    expect(existsSync(file)).toBe(true);
  });

  it("throws ObjectNotFoundError for a missing object", async () => {
    const missing = hashBytes(Buffer.from("never stored"));
    await expect(store.get(missing)).rejects.toThrow(ObjectNotFoundError);
  });

  it("validates object ids passed to get/has", async () => {
    await expect(store.get("not-a-hash" as never)).rejects.toThrow(InvalidObjectIdError);
    await expect(store.has("xyz" as never)).rejects.toThrow(InvalidObjectIdError);
  });

  it("detects corrupted (undecompressable) bytes", async () => {
    const id = await store.put(createBlob("will be corrupted"));
    const file = path.join(gitvizDir, "objects", id.slice(0, 2), id.slice(2));
    await fs.writeFile(file, Buffer.from("not valid zlib data"));
    await expect(store.get(id)).rejects.toThrow(CorruptObjectError);
  });

  it("detects an integrity mismatch (bytes stored under the wrong id)", async () => {
    // Place object A's bytes at object B's path; the recomputed hash won't match.
    const wrongId = hashBytes(Buffer.from("some other id"));
    const framed = frameObject("blob", serialize(createBlob("mismatched")));
    const dir = path.join(gitvizDir, "objects", wrongId.slice(0, 2));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, wrongId.slice(2)), await deflate(framed));

    await expect(store.get(wrongId)).rejects.toThrow(CorruptObjectError);
  });
});
