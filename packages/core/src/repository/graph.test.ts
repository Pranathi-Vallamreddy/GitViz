import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Repository } from "./repository.js";

const author = { name: "Ada", email: "ada@example.com" };

let workdir: string;
let repo: Repository;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "gitviz-graph-"));
  repo = await Repository.init(workdir);
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

async function write(rel: string, contents: string): Promise<void> {
  await fs.writeFile(path.join(workdir, rel), contents);
}

describe("Repository.graph", () => {
  it("reports an unborn HEAD with no commits", async () => {
    const graph = await repo.graph();
    expect(graph.commits).toEqual([]);
    expect(graph.refs).toEqual([]);
    expect(graph.head).toEqual({ kind: "unborn", branch: "main" });
  });

  it("collects commits from all branch tips, newest first", async () => {
    await write("f", "1");
    const c1 = await repo.commit("first", author, 1000);
    await write("f", "2");
    const c2 = await repo.commit("second", author, 2000);

    // A second branch tip that diverges at c1 (only reachable via this ref).
    await repo.refs.setBranch("feature", c1);
    await repo.checkout("feature");
    await write("g", "feature");
    const c3 = await repo.commit("feature work", author, 3000);

    // Back on main for a stable HEAD assertion.
    await repo.checkout("main");
    const graph = await repo.graph();

    // c3 (feature) and c2 (main) are tips; both reach c1. Newest-first by time.
    expect(graph.commits.map((e) => e.id)).toEqual([c3, c2, c1]);

    expect(graph.refs).toEqual([
      { name: "feature", fullName: "refs/heads/feature", target: c3 },
      { name: "main", fullName: "refs/heads/main", target: c2 },
    ]);

    expect(graph.head).toEqual({ kind: "branch", branch: "main", commit: c2 });
  });

  it("reports a detached HEAD", async () => {
    await write("f", "1");
    const c1 = await repo.commit("first", author, 1000);
    await write("f", "2");
    await repo.commit("second", author, 2000);

    await repo.checkout(c1); // detach onto the first commit
    const graph = await repo.graph();
    expect(graph.head).toEqual({ kind: "detached", commit: c1 });
  });
});
