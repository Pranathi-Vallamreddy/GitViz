/**
 * Data-transfer objects: the wire contract between the GitViz server and web
 * client. These are plain, JSON-serializable shapes — the engine's internal
 * representations (Buffers, branded ids) are mapped to these before crossing the
 * network, so the API stays stable and type-checked on both ends.
 *
 * This module defines the **commit-graph** contract (features 1–3: graph,
 * branches, HEAD). Tree/blob DTOs for the file explorer are added later.
 */

/** A commit, flattened for transport. Hashes are plain lowercase-hex strings. */
export interface CommitDTO {
  /** This commit's content hash. */
  id: string;
  /** Parent commit hashes, first-parent first. Empty for a root commit. */
  parents: string[];
  author: { name: string; email: string };
  /** Authoring time, Unix epoch milliseconds (UTC). */
  timestamp: number;
  message: string;
  /** Hash of the root tree this commit snapshots. */
  tree: string;
}

/** A branch reference. */
export interface RefDTO {
  /** Short name, e.g. `main`. */
  name: string;
  /** Fully-qualified name, e.g. `refs/heads/main`. */
  fullName: string;
  /** Commit hash the ref points at. */
  target: string;
}

/**
 * The state of HEAD:
 *  - `branch`   — attached to a branch that has at least one commit.
 *  - `detached` — pointing directly at a commit (no current branch).
 *  - `unborn`   — attached to a branch that has no commits yet (fresh repo).
 */
export type HeadDTO =
  | { kind: "branch"; branch: string; commit: string }
  | { kind: "detached"; commit: string }
  | { kind: "unborn"; branch: string };

/** The full commit-graph payload powering the graph, branch, and HEAD views. */
export interface GraphDTO {
  /** All commits reachable from any branch tip or HEAD, newest first. */
  commits: CommitDTO[];
  /** All branch refs. */
  refs: RefDTO[];
  head: HeadDTO;
}

/** One entry of a tree object on the wire. */
export interface TreeEntryDTO {
  name: string;
  type: "blob" | "tree";
  /** Content hash of the referenced object. */
  hash: string;
}

/**
 * A content-addressed object, decoded for the inspector. The discriminant
 * `type` makes the Merkle structure explicit: a commit points at a tree and
 * parents, a tree points at blobs/sub-trees, a blob is leaf content.
 */
export type ObjectDTO =
  | {
      type: "commit";
      id: string;
      parents: string[];
      author: { name: string; email: string };
      timestamp: number;
      message: string;
      tree: string;
    }
  | { type: "tree"; id: string; entries: TreeEntryDTO[] }
  | {
      type: "blob";
      id: string;
      /** Total size of the blob in bytes. */
      size: number;
      /** How `content` is encoded: UTF-8 text, or base64 for binary. */
      encoding: "utf8" | "base64";
      /** The (possibly truncated) content in the given encoding. */
      content: string;
      /** True when `content` is only a prefix of a large blob. */
      truncated: boolean;
    };

/** Repository summary for the overview header/page. */
export interface OverviewDTO {
  /** Display name (the repository directory's basename). */
  repoName: string;
  head: HeadDTO;
  /** Current branch, or null when HEAD is detached. */
  currentBranch: string | null;
  counts: {
    /** Reachable commits. */
    commits: number;
    /** Branch refs. */
    branches: number;
    /** Distinct stored content-addressed objects (blobs + trees + commits). */
    objects: number;
  };
}
