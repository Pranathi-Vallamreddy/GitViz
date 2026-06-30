import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { hashBytes, Repository, type ObjectId } from "@gitviz/core";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let app: FastifyInstance;
let commitId: ObjectId;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-objects-"));
  const repo = await Repository.init(workdir);
  await fs.writeFile(path.join(workdir, "hello.txt"), "hello world");
  commitId = await repo.commit("first", author, 1000);

  process.env.GITVIZ_REPO = workdir;
  app = await buildApp();
});

afterEach(async () => {
  delete process.env.GITVIZ_REPO;
  await app.close();
  await fs.rm(workdir, { recursive: true, force: true });
});

async function getObject(hash: string) {
  const res = await app.inject({ method: "GET", url: `/api/objects/${hash}` });
  return res;
}

describe("GET /api/objects/:hash", () => {
  it("walks commit → tree → blob by hash (the Merkle DAG)", async () => {
    const commit = (await getObject(commitId)).json();
    expect(commit.type).toBe("commit");
    expect(commit.message).toBe("first");

    const tree = (await getObject(commit.tree)).json();
    expect(tree.type).toBe("tree");
    const entry = tree.entries.find((e: { name: string }) => e.name === "hello.txt");
    expect(entry.type).toBe("blob");

    const blob = (await getObject(entry.hash)).json();
    expect(blob).toMatchObject({
      type: "blob",
      encoding: "utf8",
      content: "hello world",
      truncated: false,
    });
  });

  it("returns 400 for an invalid hash", async () => {
    expect((await getObject("not-a-hash")).statusCode).toBe(400);
  });

  it("returns 404 for an unknown object", async () => {
    const missing = hashBytes(Buffer.from("never stored"));
    expect((await getObject(missing)).statusCode).toBe(404);
  });
});
