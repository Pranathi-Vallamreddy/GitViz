import { GitBranchIcon, MarkGithubIcon, SyncIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, Box, Button, Heading, Text } from "@primer/react";
import { useQueryClient } from "@tanstack/react-query";

import { useGraph, useOverview } from "../api/queries";
import { shortHash } from "../lib/format";
import { useRepoView } from "./RepoViewContext";

/** Describes HEAD as a compact, monospace-friendly string. */
function headText(
  head:
    | { kind: "branch"; branch: string; commit: string }
    | { kind: "detached"; commit: string }
    | { kind: "unborn"; branch: string },
): string {
  switch (head.kind) {
    case "branch":
      return `HEAD → ${head.branch}`;
    case "detached":
      return `HEAD detached @ ${shortHash(head.commit)}`;
    case "unborn":
      return `unborn branch ${head.branch}`;
  }
}

/**
 * Top repository bar: repo identity, a branch picker (read-only view filter), the
 * HEAD indicator, and a global Refresh that re-fetches live data.
 */
export function RepoHeader() {
  const overview = useOverview();
  const graph = useGraph();
  const { selectedBranch, setSelectedBranch } = useRepoView();
  const queryClient = useQueryClient();

  const branches = graph.data?.refs ?? [];
  const activeBranch = selectedBranch ?? overview.data?.currentBranch ?? null;

  return (
    <Box
      as="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        px: 3,
        height: 56,
        flexShrink: 0,
        borderBottom: "1px solid",
        borderColor: "border.default",
        bg: "canvas.subtle",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <MarkGithubIcon size={24} />
        <Heading as="h1" sx={{ fontSize: 2 }}>
          GitViz
        </Heading>
      </Box>

      {overview.data && (
        <Text sx={{ fontFamily: "mono", fontSize: 1, color: "fg.muted" }}>
          {overview.data.repoName}
        </Text>
      )}

      <ActionMenu>
        <ActionMenu.Button leadingVisual={GitBranchIcon} size="small">
          {activeBranch ?? "branches"}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="small">
          <ActionList selectionVariant="single">
            {branches.map((ref) => (
              <ActionList.Item
                key={ref.name}
                selected={ref.name === activeBranch}
                onSelect={() => setSelectedBranch(ref.name)}
              >
                {ref.name}
                <ActionList.TrailingVisual>
                  <Text sx={{ fontFamily: "mono", fontSize: 0 }}>
                    {shortHash(ref.target)}
                  </Text>
                </ActionList.TrailingVisual>
              </ActionList.Item>
            ))}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

      {overview.data && (
        <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted" }}>
          {headText(overview.data.head)}
        </Text>
      )}

      <Button
        leadingVisual={SyncIcon}
        size="small"
        onClick={() => {
          void queryClient.invalidateQueries();
        }}
        sx={{ ml: "auto" }}
      >
        Refresh
      </Button>
    </Box>
  );
}
