import type {
  CommitLogEntry,
  GitVizObject,
  HeadState,
  RepoGraph,
  RepoOverview,
} from "@gitviz/core";
import type {
  CommitDTO,
  GraphDTO,
  HeadDTO,
  ObjectDTO,
  OverviewDTO,
} from "@gitviz/shared";

/** Cap on inline blob content returned to the inspector (256 KiB). */
const MAX_BLOB_BYTES = 256 * 1024;

/**
 * Maps engine read-model types to the JSON wire contract. Branded `ObjectId`s
 * are plain strings on the wire, and arrays are copied so DTOs are mutable,
 * serializable plain objects.
 */

export function toCommitDTO({ id, commit }: CommitLogEntry): CommitDTO {
  return {
    id,
    parents: [...commit.parents],
    author: { name: commit.author.name, email: commit.author.email },
    timestamp: commit.timestamp,
    message: commit.message,
    tree: commit.tree,
  };
}

export function toHeadDTO(head: HeadState): HeadDTO {
  switch (head.kind) {
    case "branch":
      return { kind: "branch", branch: head.branch, commit: head.commit };
    case "detached":
      return { kind: "detached", commit: head.commit };
    case "unborn":
      return { kind: "unborn", branch: head.branch };
  }
}

export function toGraphDTO(graph: RepoGraph): GraphDTO {
  return {
    commits: graph.commits.map(toCommitDTO),
    refs: graph.refs.map((ref) => ({
      name: ref.name,
      fullName: ref.fullName,
      target: ref.target,
    })),
    head: toHeadDTO(graph.head),
  };
}

export function toOverviewDTO(overview: RepoOverview): OverviewDTO {
  return {
    repoName: overview.repoName,
    head: toHeadDTO(overview.head),
    currentBranch: overview.currentBranch,
    counts: { ...overview.counts },
  };
}

/** Heuristic: a NUL byte in the content marks the blob as binary. */
function isBinary(data: Buffer): boolean {
  return data.includes(0);
}

/** Maps a decoded engine object to its wire form (decoding blob bytes). */
export function toObjectDTO(id: string, object: GitVizObject): ObjectDTO {
  switch (object.type) {
    case "commit":
      return {
        type: "commit",
        id,
        parents: [...object.parents],
        author: { name: object.author.name, email: object.author.email },
        timestamp: object.timestamp,
        message: object.message,
        tree: object.tree,
      };
    case "tree":
      return {
        type: "tree",
        id,
        entries: object.entries.map((e) => ({
          name: e.name,
          type: e.type,
          hash: e.hash,
        })),
      };
    case "blob": {
      const size = object.data.length;
      const truncated = size > MAX_BLOB_BYTES;
      const slice = truncated ? object.data.subarray(0, MAX_BLOB_BYTES) : object.data;
      const binary = isBinary(slice);
      return {
        type: "blob",
        id,
        size,
        encoding: binary ? "base64" : "utf8",
        content: slice.toString(binary ? "base64" : "utf8"),
        truncated,
      };
    }
  }
}
