import { GitMergeIcon } from "@primer/octicons-react";
import { Box, Heading, Spinner, Text } from "@primer/react";
import { useState } from "react";

import { useGraph } from "../api/queries";
import { CommitDetails } from "../components/CommitDetails";
import { CommitGraph } from "../graph/CommitGraph";

/**
 * The commit DAG view. Always renders the full graph — every branch and merge —
 * which is the point of a "network" view. Click a node to open the inspector.
 */
export function NetworkPage() {
  const graph = useGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (graph.isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }
  if (graph.isError) {
    return <Box sx={{ p: 4, color: "danger.fg" }}>Failed to load graph.</Box>;
  }
  if (graph.data.commits.length === 0) {
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
    ? (graph.data.commits.find((c) => c.id === selectedId) ?? null)
    : null;
  const selectedRefs = selected
    ? graph.data.refs.filter((r) => r.target === selected.id).map((r) => r.name)
    : [];
  const headCommit = "commit" in graph.data.head ? graph.data.head.commit : null;

  return (
    <Box sx={{ height: "100%", display: "flex", minHeight: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <CommitGraph
          graph={graph.data}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </Box>

      <Box
        sx={{
          width: 340,
          flexShrink: 0,
          borderLeft: "1px solid",
          borderColor: "border.default",
          bg: "canvas.default",
          overflow: "auto",
          p: 4,
        }}
      >
        {selected ? (
          <CommitDetails
            commit={selected}
            refs={selectedRefs}
            isHead={selected.id === headCommit}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: "fg.muted",
              textAlign: "center",
            }}
          >
            <GitMergeIcon size={24} />
            <Text sx={{ fontSize: 1 }}>Select a commit to inspect it.</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
