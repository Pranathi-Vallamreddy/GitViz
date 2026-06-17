import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CheckoutError } from "../errors.js";
import { Repository } from "./repository.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let repo: Repository;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-checkout-"));
  repo = await Repository.init(workdir);
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

async function write(rel: string, contents: string): Promise<void> {
  const full = path.join(workdir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, contents);
}

async function read(rel: string): Promise<string> {
  return fs.readFile(path.join(workdir, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(path.join(workdir, rel));
}

/** Sets up two commits on two branches: main (v1 + old.txt) and feature (v2 + new/nested). */
async function twoBranches(): Promise<{ c1: string; c2: string }> {
  await write("file.txt", "v1");
  await write("old.txt", "remove me");
  const c1 = await repo.commit("on main", author, 1000);

  // feature branch diverges from c1
  const featureRepo = repo; // same repo; create branch by committing after switching
  await repo.refs.setBranch("feature", c1);
  await repo.refs.setHeadToBranch("feature");
  await fs.rm(path.join(workdir, "old.txt"));
  await write("file.txt", "v2");
  await write("nested/deep/app.ts", "code");
  const c2 = await featureRepo.commit("on feature", author, 2000);

  // back to main
  await repo.checkout("main");
  return { c1, c2 };
}

describe("checkout", () => {
  it("checks out a branch and updates HEAD symbolically", async () => {
    const { c2 } = await twoBranches();

    const result = await repo.checkout("feature");

    expect(result).toEqual({ commit: c2, branch: "feature", detached: false });
    expect(await repo.refs.currentBranch()).toBe("feature");
    expect(await read("file.txt")).toBe("v2");
  });

  it("materializes nested directories from the tree", async () => {
    await twoBranches();
    await repo.checkout("feature");
    expect(await read("nested/deep/app.ts")).toBe("code");
  });

  it("removes files tracked by the old commit but absent in the target", async () => {
    await twoBranches();
    // On main, old.txt exists; switching to feature (which deleted it) removes it.
    expect(exists("old.txt")).toBe(true);
    await repo.checkout("feature");
    expect(exists("old.txt")).toBe(false);
    // The now-empty directory is also pruned after switching back.
    await repo.checkout("main");
    expect(exists("nested")).toBe(false);
  });

  it("detaches HEAD when checking out a commit id", async () => {
    const { c1 } = await twoBranches();
    const result = await repo.checkout(c1);

    expect(result.detached).toBe(true);
    expect(result.commit).toBe(c1);
    expect(await repo.refs.currentBranch()).toBeUndefined();
    expect(await repo.refs.resolveHead()).toBe(c1);
  });

  it("refuses to overwrite uncommitted local changes", async () => {
    await twoBranches();
    await write("file.txt", "uncommitted edit"); // dirty on main

    await expect(repo.checkout("feature")).rejects.toThrow(CheckoutError);
    expect(await read("file.txt")).toBe("uncommitted edit"); // untouched
  });

  it("discards local changes when forced", async () => {
    await twoBranches();
    await write("file.txt", "uncommitted edit");

    await repo.checkout("feature", { force: true });
    expect(await read("file.txt")).toBe("v2");
  });

  it("throws for an unknown target", async () => {
    await twoBranches();
    await expect(repo.checkout("nonexistent")).rejects.toThrow(CheckoutError);
  });

  it("leaves untracked files untouched", async () => {
    await twoBranches();
    await write("scratch.txt", "my notes");
    await repo.checkout("feature");
    expect(await read("scratch.txt")).toBe("my notes");
  });
});
