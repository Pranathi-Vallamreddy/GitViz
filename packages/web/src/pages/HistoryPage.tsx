import type { RefDTO } from "@gitviz/shared";
import { GitCommitIcon } from "@primer/octicons-react";
import { Box, Label, Spinner, Text } from "@primer/react";
import { useMemo } from "react";

import { useGraph, useOverview } from "../api/queries";
import { useRepoView } from "../app/RepoViewContext";
import { HashLink } from "../components/Hash";
import { reachableCommits } from "../graph/reachable";
import { relativeTime } from "../lib/format";

/** GitHub-style commit history: a dense, scannable table of the commit DAG. */
export function HistoryPage() {
  const graph = useGraph();
  const overview = useOverview();
  const { selectedBranch } = useRepoView();

  const activeBranch = selectedBranch ?? overview.data?.currentBranch ?? null;

  const { commits, refsByCommit } = useMemo(() => {
    const all = graph.data?.commits ?? [];
    const refs = graph.data?.refs ?? [];
    const tip = refs.find((r) => r.name === activeBranch)?.target ?? null;

    const byCommit = new Map<string, RefDTO[]>();
    for (const ref of refs) {
      const list = byCommit.get(ref.target) ?? [];
      list.push(ref);
      byCommit.set(ref.target, list);
    }
    return { commits: reachableCommits(all, tip), refsByCommit: byCommit };
  }, [graph.data, activeBranch]);

  if (graph.isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }
  if (graph.isError) {
    return <Box sx={{ p: 4, color: "danger.fg" }}>Failed to load history.</Box>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: 980 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <GitCommitIcon size={20} />
        <Text sx={{ fontSize: 3, fontWeight: "bold" }}>Commits</Text>
        <Label variant="secondary">{commits.length}</Label>
        {activeBranch && <Label variant="accent">{activeBranch}</Label>}
      </Box>

      <Box sx={{ border: "1px solid", borderColor: "border.default", borderRadius: 2 }}>
        {commits.map((commit, index) => (
          <Box
            key={commit.id}
            sx={{
              px: 3,
              py: 2,
              borderTop: index === 0 ? "none" : "1px solid",
              borderColor: "border.muted",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Text
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 1,
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {commit.message.split("\n")[0]}
              </Text>
              {(refsByCommit.get(commit.id) ?? []).map((ref) => (
                <Label key={ref.name} variant="accent">
                  {ref.name}
                </Label>
              ))}
              <HashLink id={commit.id} />
            </Box>
            <Box sx={{ display: "flex", gap: 2, mt: 1, color: "fg.muted", fontSize: 0 }}>
              <Text>{commit.author.name}</Text>
              <Text>committed {relativeTime(commit.timestamp)}</Text>
              {commit.parents.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Text>·</Text>
                  <Text>{commit.parents.length === 1 ? "parent" : "parents"}</Text>
                  {commit.parents.map((p) => (
                    <HashLink key={p} id={p} color="fg.muted" />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
