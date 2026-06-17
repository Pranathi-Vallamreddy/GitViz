import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { Repository, type ObjectId } from "@gitviz/core";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let app: FastifyInstance;
let c1: ObjectId;
let c2: ObjectId;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-server-"));
  const repo = await Repository.init(workdir);
  await fs.writeFile(path.join(workdir, "a.txt"), "1");
  c1 = await repo.commit("first", author, 1000);
  await fs.writeFile(path.join(workdir, "a.txt"), "2");
  c2 = await repo.commit("second", author, 2000);
  // A second branch tip pointing at the first commit.
  await repo.refs.setBranch("feature", c1);

  process.env.GITVIZ_REPO = workdir;
  app = await buildApp();
});

afterEach(async () => {
  delete process.env.GITVIZ_REPO;
  await app.close();
  await fs.rm(workdir, { recursive: true, force: true });
});

describe("GET /api/graph", () => {
  it("returns the commit graph, refs, and HEAD", async () => {
    const res = await app.inject({ method: "GET", url: "/api/graph" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.commits.map((c: { message: string }) => c.message)).toEqual([
      "second",
      "first",
    ]);
    expect(body.refs).toEqual([
      { name: "feature", fullName: "refs/heads/feature", target: c1 },
      { name: "main", fullName: "refs/heads/main", target: c2 },
    ]);
    expect(body.head).toEqual({ kind: "branch", branch: "main", commit: c2 });
  });

  it("shapes each commit as a CommitDTO", async () => {
    const res = await app.inject({ method: "GET", url: "/api/graph" });
    const newest = res.json().commits[0];
    expect(newest).toMatchObject({
      id: c2,
      parents: [c1],
      author: { name: "Ada", email: "ada@example.com" },
      timestamp: 2000,
      message: "second",
    });
    expect(typeof newest.tree).toBe("string");
  });

  it("returns 409 when the configured path is not a repository", async () => {
    process.env.GITVIZ_REPO = path.join(workdir, "does-not-exist");
    const res = await app.inject({ method: "GET", url: "/api/graph" });
    expect(res.statusCode).toBe(409);
  });
});
