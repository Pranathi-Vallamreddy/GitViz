import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tree } from "../objects/types.js";
import { Repository } from "./repository.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let repo: Repository;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-repo-"));
  repo = await Repository.init(workdir);
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

/** Writes a file (creating parent dirs) relative to the working directory. */
async function write(rel: string, contents: string): Promise<void> {
  const full = path.join(workdir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, contents);
}

async function tree(id: string): Promise<Tree> {
  const object = await repo.objects.get(id as never);
  if (object.type !== "tree") throw new Error("expected tree");
  return object;
}

describe("writeTree", () => {
  it("snapshots nested directories into trees and blobs", async () => {
    await write("README.md", "# Hello\n");
    await write("src/app.ts", "export const x = 1;\n");
    await write("src/util/math.ts", "export const add = 1;\n");

    const rootId = await repo.writeTree();
    const root = await tree(rootId);
    expect(root.entries.map((e) => `${e.type}:${e.name}`)).toEqual([
      "blob:README.md",
      "tree:src",
    ]);

    const src = await tree(root.entries.find((e) => e.name === "src")!.hash);
    expect(src.entries.map((e) => `${e.type}:${e.name}`)).toEqual([
      "blob:app.ts",
      "tree:util",
    ]);
  });

  it("is deterministic: an unchanged tree produces the same id", async () => {
    await write("a.txt", "a");
    await write("dir/b.txt", "b");
    expect(await repo.writeTree()).toBe(await repo.writeTree());
  });

  it("deduplicates identical file content across paths (one blob)", async () => {
    await write("x.txt", "same bytes");
    await write("nested/y.txt", "same bytes");

    const rootId = await repo.writeTree();
    const root = await tree(rootId);
    const xHash = root.entries.find((e) => e.name === "x.txt")!.hash;
    const nested = await tree(root.entries.find((e) => e.name === "nested")!.hash);
    const yHash = nested.entries.find((e) => e.name === "y.txt")!.hash;
    expect(xHash).toBe(yHash);
  });

  it("never includes the .gitviz metadata directory", async () => {
    await write("file.txt", "hi");
    const root = await tree(await repo.writeTree());
    expect(root.entries.some((e) => e.name === ".gitviz")).toBe(false);
  });
});

describe("commit", () => {
  it("creates a commit, advances the branch, and links the parent", async () => {
    await write("file.txt", "v1");
    const c1 = await repo.commit("first", author, 1000);

    expect(await repo.refs.resolveHead()).toBe(c1);
    expect(await repo.refs.readBranch("main")).toBe(c1);

    await write("file.txt", "v2");
    const c2 = await repo.commit("second", author, 2000);

    const head = await repo.objects.get(c2);
    if (head.type !== "commit") throw new Error("expected commit");
    expect(head.parents).toEqual([c1]);
    expect(await repo.refs.resolveHead()).toBe(c2);
  });
});

describe("log", () => {
  it("returns an empty array for a repo with no commits", async () => {
    expect(await repo.log()).toEqual([]);
  });

  it("returns commits newest-first", async () => {
    await write("f", "1");
    const c1 = await repo.commit("first", author, 1000);
    await write("f", "2");
    const c2 = await repo.commit("second", author, 2000);
    await write("f", "3");
    const c3 = await repo.commit("third", author, 3000);

    const ids = (await repo.log()).map((e) => e.id);
    expect(ids).toEqual([c3, c2, c1]);
  });
});
