import type { CommitDTO, GraphDTO, HeadDTO, RefDTO } from "@gitviz/shared";
import { describe, expect, it } from "vitest";

import { layoutGraph } from "./layout";

function commit(id: string, parents: string[], timestamp: number): CommitDTO {
  return {
    id,
    parents,
    author: { name: "Ada", email: "ada@example.com" },
    timestamp,
    message: id,
    tree: `tree-${id}`,
  };
}

function graph(commits: CommitDTO[], refs: RefDTO[], head: HeadDTO): GraphDTO {
  return { commits, refs, head };
}

/** Convenience: map node id -> node for assertions. */
function nodesById(layout: ReturnType<typeof layoutGraph>) {
  return new Map(layout.nodes.map((n) => [n.id, n]));
}

describe("layoutGraph", () => {
  it("handles an empty graph", () => {
    const layout = layoutGraph(graph([], [], { kind: "unborn", branch: "main" }));
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.laneCount).toBe(0);
  });

  it("lays out a linear history in a single lane, newest on top", () => {
    const commits = [
      commit("c3", ["c2"], 3000),
      commit("c2", ["c1"], 2000),
      commit("c1", [], 1000),
    ];
    const layout = layoutGraph(
      graph(commits, [{ name: "main", fullName: "refs/heads/main", target: "c3" }], {
        kind: "branch",
        branch: "main",
        commit: "c3",
      }),
    );

    const n = nodesById(layout);
    expect([n.get("c3")!.row, n.get("c2")!.row, n.get("c1")!.row]).toEqual([0, 1, 2]);
    expect(layout.nodes.every((node) => node.lane === 0)).toBe(true);
    expect(layout.laneCount).toBe(1);

    // Coordinates follow row/lane * spacing (defaults 80 / 64).
    expect(n.get("c2")!.x).toBe(0);
    expect(n.get("c2")!.y).toBe(80);

    expect(layout.edges).toEqual([
      { id: "c3->c2", source: "c3", target: "c2", fromLane: 0, toLane: 0 },
      { id: "c2->c1", source: "c2", target: "c1", fromLane: 0, toLane: 0 },
    ]);

    expect(n.get("c3")!.isHead).toBe(true);
    expect(n.get("c1")!.isHead).toBe(false);
    expect(n.get("c3")!.refs.map((r) => r.name)).toEqual(["main"]);
  });

  it("forks two tips that share an ancestor into two lanes", () => {
    // c2 and c3 are both children of c1.
    const commits = [
      commit("c3", ["c1"], 3000),
      commit("c2", ["c1"], 2000),
      commit("c1", [], 1000),
    ];
    const layout = layoutGraph(
      graph(commits, [], { kind: "branch", branch: "main", commit: "c3" }),
    );
    const n = nodesById(layout);

    expect(n.get("c3")!.lane).toBe(0);
    expect(n.get("c2")!.lane).toBe(1);
    expect(n.get("c1")!.lane).toBe(0); // first parent of c3 continues lane 0
    expect(layout.laneCount).toBe(2);

    // c2's line merges back into c1's lane (0).
    const c2Edge = layout.edges.find((e) => e.source === "c2")!;
    expect(c2Edge).toMatchObject({ target: "c1", fromLane: 1, toLane: 0 });
  });

  it("forks a new lane for a merge's second parent", () => {
    // m is a merge of a and b, which both descend from base.
    const commits = [
      commit("m", ["a", "b"], 4000),
      commit("a", ["base"], 3000),
      commit("b", ["base"], 2000),
      commit("base", [], 1000),
    ];
    const layout = layoutGraph(
      graph(commits, [], { kind: "branch", branch: "main", commit: "m" }),
    );
    const n = nodesById(layout);

    expect(n.get("m")!.lane).toBe(0);
    expect(n.get("a")!.lane).toBe(0); // first parent continues
    expect(n.get("b")!.lane).toBe(1); // second parent forks a lane
    expect(n.get("base")!.lane).toBe(0);
    expect(layout.laneCount).toBe(2);

    const mEdges = layout.edges.filter((e) => e.source === "m");
    expect(mEdges).toEqual([
      { id: "m->a", source: "m", target: "a", fromLane: 0, toLane: 0 },
      { id: "m->b", source: "m", target: "b", fromLane: 0, toLane: 1 },
    ]);
  });

  it("orders topologically even when a parent has a newer timestamp (clock skew)", () => {
    // c2 is a child of c1, but c1's timestamp is newer. Topology must still win:
    // the child appears above its parent. Input order is parent-first to prove
    // the layout does not rely on the array order.
    const commits = [
      commit("c1", [], 5000), // parent, newer clock
      commit("c2", ["c1"], 1000), // child, older clock
    ];
    const layout = layoutGraph(
      graph(commits, [], { kind: "branch", branch: "main", commit: "c2" }),
    );
    const n = nodesById(layout);
    expect(n.get("c2")!.row).toBe(0);
    expect(n.get("c1")!.row).toBe(1);
  });

  it("marks the HEAD commit when detached", () => {
    const commits = [commit("c2", ["c1"], 2000), commit("c1", [], 1000)];
    const layout = layoutGraph(graph(commits, [], { kind: "detached", commit: "c1" }));
    const n = nodesById(layout);
    expect(n.get("c1")!.isHead).toBe(true);
    expect(n.get("c2")!.isHead).toBe(false);
  });
});
