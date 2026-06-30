import type { CommitDTO } from "@gitviz/shared";

/**
 * Returns the commits reachable from `tip` (the tip itself plus all ancestors),
 * preserving the input order (newest-first from the server). Used to "re-root"
 * the history and network views on a selected branch — a read-only view filter.
 *
 * If `tip` is null/absent, the full list is returned unchanged.
 */
export function reachableCommits(commits: CommitDTO[], tip: string | null): CommitDTO[] {
  if (!tip) return commits;

  const byId = new Map(commits.map((c) => [c.id, c]));
  const reachable = new Set<string>();
  const stack = [tip];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const commit = byId.get(id);
    if (commit) stack.push(...commit.parents);
  }

  return commits.filter((c) => reachable.has(c.id));
}
