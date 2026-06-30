import type { CommitDTO, GraphDTO, RefDTO } from "@gitviz/shared";

/**
 * Pure commit-graph layout engine.
 *
 * Turns a {@link GraphDTO} into positioned nodes and edges for a "railroad" DAG
 * rendering (the style of `git log --graph` / gitk). It is framework-agnostic —
 * no React or React Flow imports — so it is unit-testable in isolation, and its
 * output maps directly onto React Flow's node/edge shape at render time.
 *
 * Two steps:
 *  1. **Topological order** — newest commits on top, every commit strictly above
 *     all of its parents (robust to clock skew, unlike a pure timestamp sort).
 *  2. **Lane assignment** — each commit gets a column ("lane") using the classic
 *     reserve-a-lane-for-your-first-parent / fork-a-new-lane-for-merges scheme.
 *
 * Coordinates are then `x = lane * columnWidth`, `y = row * rowHeight`.
 */

/** A positioned commit node. */
export interface LayoutNode {
  /** Commit id (used as the React Flow node id). */
  id: string;
  /** Vertical order index (0 = newest, at the top). */
  row: number;
  /** Horizontal lane index (0 = leftmost column). */
  lane: number;
  x: number;
  y: number;
  /** The commit payload, for the node renderer / inspector. */
  commit: CommitDTO;
  /** Whether HEAD currently resolves to this commit. */
  isHead: boolean;
  /** Branch refs pointing at this commit (for badges). */
  refs: RefDTO[];
}

/** A parent edge (child → parent), annotated with the lanes it connects. */
export interface LayoutEdge {
  id: string;
  /** Child commit id. */
  source: string;
  /** Parent commit id. */
  target: string;
  fromLane: number;
  toLane: number;
}

/** The complete positioned graph. */
export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** Number of lanes (columns) the layout occupies. */
  laneCount: number;
  rowHeight: number;
  columnWidth: number;
}

/** Tunable spacing for coordinate generation. */
export interface LayoutOptions {
  rowHeight?: number;
  columnWidth?: number;
}

const DEFAULT_ROW_HEIGHT = 80;
const DEFAULT_COLUMN_WIDTH = 64;

/**
 * Topologically orders commits so each appears before all of its parents, with
 * ties broken by timestamp (newest first) then id, for a stable, chronological
 * layout. Implemented as Kahn's algorithm over child→parent edges: tips (no
 * children) have in-degree 0 and are emitted first.
 */
function topologicalOrder(commits: CommitDTO[], byId: Map<string, CommitDTO>): string[] {
  const inDegree = new Map<string, number>();
  for (const commit of commits) inDegree.set(commit.id, 0);
  for (const commit of commits) {
    for (const parent of commit.parents) {
      if (byId.has(parent)) inDegree.set(parent, (inDegree.get(parent) ?? 0) + 1);
    }
  }

  // Higher priority = emitted earlier (placed nearer the top).
  const higherPriority = (a: string, b: string): boolean => {
    const ca = byId.get(a)!;
    const cb = byId.get(b)!;
    if (ca.timestamp !== cb.timestamp) return ca.timestamp > cb.timestamp;
    return a > b;
  };

  const ready = commits.filter((c) => (inDegree.get(c.id) ?? 0) === 0).map((c) => c.id);
  const order: string[] = [];

  while (ready.length > 0) {
    let best = 0;
    for (let i = 1; i < ready.length; i++) {
      if (higherPriority(ready[i]!, ready[best]!)) best = i;
    }
    const id = ready.splice(best, 1)[0]!;
    order.push(id);

    for (const parent of byId.get(id)!.parents) {
      if (!byId.has(parent)) continue;
      const remaining = (inDegree.get(parent) ?? 0) - 1;
      inDegree.set(parent, remaining);
      if (remaining === 0) ready.push(parent);
    }
  }

  // Defensive: a cycle would leave commits unplaced (impossible for a real DAG).
  if (order.length < commits.length) {
    const placed = new Set(order);
    for (const commit of commits) if (!placed.has(commit.id)) order.push(commit.id);
  }

  return order;
}

/**
 * Computes a railroad layout for a commit graph.
 *
 * @param graph   the server's {@link GraphDTO}
 * @param options spacing overrides
 */
export function layoutGraph(graph: GraphDTO, options: LayoutOptions = {}): GraphLayout {
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const columnWidth = options.columnWidth ?? DEFAULT_COLUMN_WIDTH;

  const byId = new Map<string, CommitDTO>();
  for (const commit of graph.commits) byId.set(commit.id, commit);

  const refsByCommit = new Map<string, RefDTO[]>();
  for (const ref of graph.refs) {
    const list = refsByCommit.get(ref.target) ?? [];
    list.push(ref);
    refsByCommit.set(ref.target, list);
  }

  const headCommit = "commit" in graph.head ? graph.head.commit : undefined;

  const order = topologicalOrder(graph.commits, byId);

  // `lanes[i]` holds the commit id currently reserved to occupy lane `i` (a child
  // reserves a lane for its parent so the line continues straight). `null` = free.
  const lanes: (string | null)[] = [];

  /** Returns the lane for `id`, reusing its reservation or claiming a lane. */
  const reserveLane = (id: string, preferred?: number): number => {
    const existing = lanes.indexOf(id);
    if (existing !== -1) return existing;
    if (preferred !== undefined && lanes[preferred] === null) {
      lanes[preferred] = id;
      return preferred;
    }
    const free = lanes.indexOf(null);
    if (free !== -1) {
      lanes[free] = id;
      return free;
    }
    lanes.push(id);
    return lanes.length - 1;
  };

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let laneCount = 0;

  order.forEach((id, row) => {
    const commit = byId.get(id)!;

    // This commit's lane: reused if a child reserved it, else a new lane (a tip).
    let lane = lanes.indexOf(id);
    if (lane === -1) lane = reserveLane(id);
    lanes[lane] = null; // placed — free the lane for the first parent to claim

    const parents = commit.parents.filter((p) => byId.has(p));
    parents.forEach((parent, index) => {
      // First parent continues this commit's lane; extra parents fork new lanes.
      const toLane = index === 0 ? reserveLane(parent, lane) : reserveLane(parent);
      edges.push({
        id: `${id}->${parent}`,
        source: id,
        target: parent,
        fromLane: lane,
        toLane,
      });
      laneCount = Math.max(laneCount, toLane + 1);
    });

    laneCount = Math.max(laneCount, lane + 1);
    nodes.push({
      id,
      row,
      lane,
      x: lane * columnWidth,
      y: row * rowHeight,
      commit,
      isHead: id === headCommit,
      refs: refsByCommit.get(id) ?? [],
    });
  });

  return { nodes, edges, laneCount, rowHeight, columnWidth };
}
