import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { Repository } from "@gitviz/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedDemoRepo } from "./seed.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-seed-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("seedDemoRepo", () => {
  it("creates a branchy demo repository", async () => {
    await seedDemoRepo(dir);

    const repo = Repository.open(dir);
    const graph = await repo.graph();

    expect(graph.commits.length).toBe(6);
    expect(graph.refs.map((r) => r.name).sort()).toEqual(["feature/graph-api", "main"]);
    expect(graph.head).toMatchObject({ kind: "branch", branch: "main" });
  });

  it("is idempotent (leaves an existing repo untouched)", async () => {
    await seedDemoRepo(dir);
    const before = (await Repository.open(dir).graph()).commits.length;
    await seedDemoRepo(dir); // second call is a no-op
    const after = (await Repository.open(dir).graph()).commits.length;
    expect(after).toBe(before);
  });
});
