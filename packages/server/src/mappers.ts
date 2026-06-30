import type { CommitLogEntry, HeadState, RepoGraph, RepoOverview } from "@gitviz/core";
import type { CommitDTO, GraphDTO, HeadDTO, OverviewDTO } from "@gitviz/shared";

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
