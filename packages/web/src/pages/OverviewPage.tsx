import type { CommitDTO } from "@gitviz/shared";
import {
  DatabaseIcon,
  GitBranchIcon,
  GitCommitIcon,
  PersonIcon,
} from "@primer/octicons-react";
import { Box, Heading, Label, Spinner, Text } from "@primer/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useGraph, useOverview } from "../api/queries";
import { useRepoView } from "../app/RepoViewContext";
import { Avatar } from "../components/Avatar";
import { HashLink } from "../components/Hash";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { reachableCommits } from "../graph/reachable";
import { relativeTime } from "../lib/format";

interface Contributor {
  name: string;
  email: string;
  count: number;
}

/** Tallies commits per author (real data derived from the graph). */
function topContributors(commits: CommitDTO[]): Contributor[] {
  const byEmail = new Map<string, Contributor>();
  for (const c of commits) {
    const existing = byEmail.get(c.author.email);
    if (existing) existing.count++;
    else
      byEmail.set(c.author.email, {
        name: c.author.name,
        email: c.author.email,
        count: 1,
      });
  }
  return [...byEmail.values()].sort((a, b) => b.count - a.count).slice(0, 5);
}

const rowHover = { "&:hover": { bg: "canvas.subtle" } } as const;

export function OverviewPage() {
  const overview = useOverview();
  const graph = useGraph();
  const { selectedBranch } = useRepoView();

  const contributors = useMemo(
    () => topContributors(graph.data?.commits ?? []),
    [graph.data],
  );

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
  const refs = graph.data.refs;
  const activeBranch = selectedBranch ?? currentBranch;
  const tip = refs.find((r) => r.name === activeBranch)?.target ?? null;
  const commits = reachableCommits(graph.data.commits, tip);
  const maxContrib = Math.max(1, ...contributors.map((c) => c.count));

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 4, maxWidth: 1180 }}>
      <Box>
        <Heading as="h2" sx={{ fontSize: 4 }}>
          {repoName}
        </Heading>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
          <Label variant="success">{activeBranch ?? "detached"}</Label>
          <Text sx={{ color: "fg.muted", fontSize: 1 }}>
            {commits.length === 0
              ? "No commits yet"
              : `${commits[0]!.message.split("\n")[0]} · ${relativeTime(commits[0]!.timestamp)}`}
          </Text>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 3 }}>
        <StatCard
          icon={GitCommitIcon}
          label="Commits"
          value={counts.commits}
          sub="all branches"
        />
        <StatCard icon={GitBranchIcon} label="Branches" value={counts.branches} />
        <StatCard
          icon={DatabaseIcon}
          label="Objects"
          value={counts.objects}
          sub="content-addressed"
        />
      </Box>

      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Box sx={{ flex: 2, minWidth: 320 }}>
          <Panel
            title={activeBranch ? `Recent commits · ${activeBranch}` : "Recent commits"}
            action={
              <Box
                as={Link}
                to="/commits"
                sx={{ fontSize: 0, color: "accent.fg", fontWeight: 400 }}
              >
                View all
              </Box>
            }
            flush
          >
            {commits.slice(0, 8).map((c, i) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 2,
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "border.muted",
                  ...rowHover,
                }}
              >
                <Avatar name={c.author.name} size={20} />
                <Text
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={c.message.split("\n")[0]}
                >
                  {c.message.split("\n")[0]}
                </Text>
                <HashLink id={c.id} />
                <Text
                  sx={{ fontSize: 0, color: "fg.muted", width: 64, textAlign: "right" }}
                >
                  {relativeTime(c.timestamp)}
                </Text>
              </Box>
            ))}
          </Panel>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 260,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <Panel title="Branches" flush>
            {refs.map((ref, i) => (
              <Box
                key={ref.name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 2,
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "border.muted",
                  ...rowHover,
                }}
              >
                <Box sx={{ color: "fg.muted", display: "flex" }}>
                  <GitBranchIcon size={14} />
                </Box>
                <Text sx={{ flex: 1, fontSize: 1, minWidth: 0 }}>{ref.name}</Text>
                {ref.name === currentBranch && <Label variant="success">HEAD</Label>}
                <HashLink id={ref.target} />
              </Box>
            ))}
          </Panel>

          <Panel
            title={
              <>
                <PersonIcon size={15} /> Top contributors
              </>
            }
            flush
          >
            {contributors.map((c, i) => (
              <Box
                key={c.email}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 2,
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "border.muted",
                }}
              >
                <Avatar name={c.name} size={24} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Text
                    sx={{
                      fontSize: 1,
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.name}
                  </Text>
                  <Box
                    sx={{
                      mt: "3px",
                      height: 4,
                      borderRadius: 4,
                      bg: "border.muted",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(c.count / maxContrib) * 100}%`,
                        bg: "accent.emphasis",
                      }}
                    />
                  </Box>
                </Box>
                <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted" }}>
                  {c.count}
                </Text>
              </Box>
            ))}
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
