import type { CommitDTO, GraphDTO } from "@gitviz/shared";
import { XIcon } from "@primer/octicons-react";
import { Box, Heading, IconButton, Label, Spinner, Text } from "@primer/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useGraph } from "../api/queries";
import { useRepoView } from "../app/RepoViewContext";
import { CommitGraph } from "../graph/CommitGraph";
import { reachableCommits } from "../graph/reachable";
import { CopyableHash, HashLink } from "../components/Hash";
import { relativeTime } from "../lib/format";

/** Right-hand panel showing the selected commit's details. */
function DetailPanel({
  commit,
  refs,
  onClose,
}: {
  commit: CommitDTO;
  refs: string[];
  onClose: () => void;
}) {
  return (
    <Box
      sx={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid",
        borderColor: "border.default",
        bg: "canvas.default",
        p: 3,
        overflow: "auto",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Heading as="h3" sx={{ fontSize: 2, flex: 1 }}>
          Commit
        </Heading>
        <IconButton
          aria-label="Close"
          size="small"
          variant="invisible"
          icon={XIcon}
          onClick={onClose}
        />
      </Box>

      <CopyableHash id={commit.id} />

      {refs.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
          {refs.map((name) => (
            <Label key={name} variant="accent">
              {name}
            </Label>
          ))}
        </Box>
      )}

      <Box
        sx={{
          mt: 3,
          p: 2,
          bg: "canvas.subtle",
          border: "1px solid",
          borderColor: "border.default",
          borderRadius: 2,
          whiteSpace: "pre-wrap",
          fontSize: 1,
        }}
      >
        {commit.message}
      </Box>

      <Box sx={{ mt: 3, fontSize: 1, color: "fg.muted" }}>
        <Text sx={{ display: "block" }}>
          {commit.author.name} &lt;{commit.author.email}&gt;
        </Text>
        <Text sx={{ display: "block" }}>{relativeTime(commit.timestamp)}</Text>
      </Box>

      <Box sx={{ mt: 3, display: "flex", gap: 3, fontSize: 1 }}>
        <Text sx={{ width: 60, color: "fg.muted" }}>tree</Text>
        <HashLink id={commit.tree} />
      </Box>
      <Box sx={{ mt: 1, display: "flex", gap: 3, fontSize: 1 }}>
        <Text sx={{ width: 60, color: "fg.muted" }}>parents</Text>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {commit.parents.length === 0 ? (
            <Text sx={{ color: "fg.muted" }}>none</Text>
          ) : (
            commit.parents.map((p) => <HashLink key={p} id={p} />)
          )}
        </Box>
      </Box>

      <Box
        as={Link}
        to={`/objects/${commit.id}`}
        sx={{ display: "inline-block", mt: 3, fontSize: 1, color: "accent.fg" }}
      >
        Open in object inspector →
      </Box>
    </Box>
  );
}

/** The commit DAG view: branch-filtered graph + click-to-inspect detail panel. */
export function NetworkPage() {
  const graph = useGraph();
  const { selectedBranch } = useRepoView();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered: GraphDTO | null = useMemo(() => {
    if (!graph.data) return null;
    const tip = selectedBranch
      ? (graph.data.refs.find((r) => r.name === selectedBranch)?.target ?? null)
      : null;
    return { ...graph.data, commits: reachableCommits(graph.data.commits, tip) };
  }, [graph.data, selectedBranch]);

  if (graph.isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }
  if (graph.isError || !filtered) {
    return <Box sx={{ p: 4, color: "danger.fg" }}>Failed to load graph.</Box>;
  }
  if (filtered.commits.length === 0) {
    return (
      <Box sx={{ p: 6, textAlign: "center", color: "fg.muted" }}>
        <Heading as="h2" sx={{ fontSize: 3, color: "fg.default" }}>
          No commits yet
        </Heading>
        <Text>
          Create one with <Text sx={{ fontFamily: "mono" }}>gitviz commit -m …</Text>.
        </Text>
      </Box>
    );
  }

  const selected = selectedId
    ? (filtered.commits.find((c) => c.id === selectedId) ?? null)
    : null;
  const selectedRefs = selected
    ? filtered.refs.filter((r) => r.target === selected.id).map((r) => r.name)
    : [];

  return (
    <Box sx={{ height: "100%", display: "flex", minHeight: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <CommitGraph graph={filtered} selectedId={selectedId} onSelect={setSelectedId} />
      </Box>
      {selected && (
        <DetailPanel
          commit={selected}
          refs={selectedRefs}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Box>
  );
}
