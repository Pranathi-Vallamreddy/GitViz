import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InvalidRefNameError, RefResolutionError } from "../errors.js";
import { hashBytes } from "../hash.js";
import { FileSystemRefStore } from "./fs-ref-store.js";
import { directRef, symbolicRef } from "./ref.js";

const commitA = hashBytes(Buffer.from("commit A"));
const commitB = hashBytes(Buffer.from("commit B"));

let gitvizDir: string;
let refs: FileSystemRefStore;

beforeEach(async () => {
  gitvizDir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-refs-"));
  refs = new FileSystemRefStore(gitvizDir);
});

afterEach(async () => {
  await fs.rm(gitvizDir, { recursive: true, force: true });
});

describe("low-level refs", () => {
  it("round-trips a direct ref", async () => {
    await refs.writeRef("refs/heads/main", directRef(commitA));
    expect(await refs.readRef("refs/heads/main")).toEqual(directRef(commitA));
  });

  it("round-trips a symbolic ref", async () => {
    await refs.writeRef("HEAD", symbolicRef("refs/heads/main"));
    expect(await refs.readRef("HEAD")).toEqual(symbolicRef("refs/heads/main"));
  });

  it("returns undefined for a missing ref", async () => {
    expect(await refs.readRef("refs/heads/nope")).toBeUndefined();
  });

  it("rejects an invalid ref name", async () => {
    await expect(refs.writeRef("not-a-ref", directRef(commitA))).rejects.toThrow(
      InvalidRefNameError,
    );
  });

  it("writes refs to a Git-compatible on-disk layout", async () => {
    await refs.setHeadToBranch("main");
    await refs.setBranch("main", commitA);

    const head = await fs.readFile(path.join(gitvizDir, "HEAD"), "utf8");
    const branch = await fs.readFile(
      path.join(gitvizDir, "refs", "heads", "main"),
      "utf8",
    );
    expect(head).toBe("ref: refs/heads/main\n");
    expect(branch).toBe(`${commitA}\n`);
  });
});

describe("branches", () => {
  it("creates, reads, lists, and deletes branches", async () => {
    await refs.setBranch("main", commitA);
    await refs.setBranch("feature/login", commitB);

    expect(await refs.readBranch("main")).toBe(commitA);
    expect(await refs.listBranches()).toEqual(["feature/login", "main"]);

    expect(await refs.deleteBranch("feature/login")).toBe(true);
    expect(await refs.deleteBranch("feature/login")).toBe(false);
    expect(await refs.listBranches()).toEqual(["main"]);
  });

  it("moves a branch atomically when updated", async () => {
    await refs.setBranch("main", commitA);
    await refs.setBranch("main", commitB);
    expect(await refs.readBranch("main")).toBe(commitB);
  });

  it("validates branch names", async () => {
    await expect(refs.setBranch("bad name", commitA)).rejects.toThrow(
      InvalidRefNameError,
    );
  });
});

describe("HEAD", () => {
  it("resolves the current branch and commit", async () => {
    await refs.setHeadToBranch("main");
    // Unborn branch: HEAD names main, but main has no commit yet.
    expect(await refs.currentBranch()).toBe("main");
    expect(await refs.resolveHead()).toBeUndefined();

    await refs.setBranch("main", commitA);
    expect(await refs.resolveHead()).toBe(commitA);
  });

  it("supports a detached HEAD", async () => {
    await refs.setHeadDetached(commitA);
    expect(await refs.currentBranch()).toBeUndefined();
    expect(await refs.resolveHead()).toBe(commitA);
    expect(await refs.getHead()).toEqual(directRef(commitA));
  });
});

describe("symbolic resolution", () => {
  it("follows a chain HEAD -> branch -> commit", async () => {
    await refs.setBranch("main", commitA);
    await refs.setHeadToBranch("main");
    expect(await refs.resolve("HEAD")).toBe(commitA);
  });

  it("detects a cycle", async () => {
    await refs.writeRef("refs/heads/a", symbolicRef("refs/heads/b"));
    await refs.writeRef("refs/heads/b", symbolicRef("refs/heads/a"));
    await expect(refs.resolve("refs/heads/a")).rejects.toThrow(RefResolutionError);
  });
});
