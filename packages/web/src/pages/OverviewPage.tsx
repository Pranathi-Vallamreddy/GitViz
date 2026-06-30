import {
  DatabaseIcon,
  GitBranchIcon,
  GitCommitIcon,
  type Icon,
} from "@primer/octicons-react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";
import { Link } from "react-router-dom";

import { useGraph, useOverview } from "../api/queries";
import { relativeTime, shortHash } from "../lib/format";

function Stat({
  icon: StatIcon,
  label,
  value,
}: {
  icon: Icon;
  label: string;
  value: number;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 2,
        p: 3,
        bg: "canvas.subtle",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, color: "fg.muted" }}>
        <StatIcon size={16} />
        <Text sx={{ fontSize: 1 }}>{label}</Text>
      </Box>
      <Text sx={{ fontFamily: "mono", fontSize: 5, fontWeight: "bold", mt: 1 }}>
        {value}
      </Text>
    </Box>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          bg: "canvas.subtle",
          borderBottom: "1px solid",
          borderColor: "border.default",
          fontWeight: "bold",
          fontSize: 1,
        }}
      >
        {title}
      </Box>
      {children}
    </Box>
  );
}

/** Repository landing page: counts, HEAD, latest commits, and branches. */
export function OverviewPage() {
  const overview = useOverview();
  const graph = useGraph();

  if (overview.isPending || graph.isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }
  if (overview.isError || graph.isError) {
    return (
      <Box sx={{ p: 4, color: "danger.fg" }}>
        Failed to load repository: {(overview.error ?? graph.error)?.message}
      </Box>
    );
  }

  const { repoName, currentBranch, counts } = overview.data;
  const commits = graph.data.commits;
  const refs = graph.data.refs;

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4, maxWidth: 1100 }}>
      <Box>
        <Heading as="h2" sx={{ fontSize: 4 }}>
          {repoName}
        </Heading>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
          <Label variant="success">{currentBranch ?? "detached"}</Label>
          <Text sx={{ color: "fg.muted", fontSize: 1 }}>
            {commits.length === 0
              ? "No commits yet"
              : `${commits[0]!.message.split("\n")[0]} · ${relativeTime(commits[0]!.timestamp)}`}
          </Text>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 3 }}>
        <Stat icon={GitCommitIcon} label="Commits" value={counts.commits} />
        <Stat icon={GitBranchIcon} label="Branches" value={counts.branches} />
        <Stat icon={DatabaseIcon} label="Objects" value={counts.objects} />
      </Box>

      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Panel title="Latest commits">
          {commits.slice(0, 6).map((c) => (
            <Box
              key={c.id}
              sx={{
                px: 3,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "border.muted",
                display: "flex",
                alignItems: "baseline",
                gap: 2,
              }}
            >
              <Text sx={{ fontFamily: "mono", fontSize: 0, color: "accent.fg" }}>
                {shortHash(c.id)}
              </Text>
              <Text
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.message.split("\n")[0]}
              </Text>
              <Text sx={{ fontSize: 0, color: "fg.muted" }}>
                {relativeTime(c.timestamp)}
              </Text>
            </Box>
          ))}
        </Panel>

        <Panel title="Branches">
          {refs.map((ref) => (
            <Box
              key={ref.name}
              sx={{
                px: 3,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "border.muted",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <GitBranchIcon size={14} />
              <Text sx={{ flex: 1, fontSize: 1 }}>{ref.name}</Text>
              <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted" }}>
                {shortHash(ref.target)}
              </Text>
            </Box>
          ))}
        </Panel>
      </Box>

      <Text sx={{ fontSize: 1, color: "fg.muted" }}>
        Explore the commit DAG in the{" "}
        <Box as={Link} to="/network" sx={{ color: "accent.fg" }}>
          Network
        </Box>{" "}
        view.
      </Text>
    </Box>
  );
}
