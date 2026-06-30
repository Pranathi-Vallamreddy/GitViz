import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { Repository } from "@gitviz/core";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let app: FastifyInstance;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-overview-"));
  const repo = await Repository.init(workdir);
  await fs.writeFile(path.join(workdir, "a.txt"), "1");
  const c1 = await repo.commit("first", author, 1000);
  await fs.writeFile(path.join(workdir, "a.txt"), "2");
  await repo.commit("second", author, 2000);
  await repo.refs.setBranch("feature", c1);

  process.env.GITVIZ_REPO = workdir;
  app = await buildApp();
});

afterEach(async () => {
  delete process.env.GITVIZ_REPO;
  await app.close();
  await fs.rm(workdir, { recursive: true, force: true });
});

describe("GET /api/overview", () => {
  it("returns repo name, HEAD, current branch, and counts", async () => {
    const res = await app.inject({ method: "GET", url: "/api/overview" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.currentBranch).toBe("main");
    expect(body.head.kind).toBe("branch");
    expect(body.counts.commits).toBe(2);
    expect(body.counts.branches).toBe(2);
    // 2 commits + their trees + the blob versions = several content-addressed objects.
    expect(body.counts.objects).toBeGreaterThanOrEqual(4);
    expect(typeof body.repoName).toBe("string");
  });
});
