import type { CommitDTO, RefDTO } from "@gitviz/shared";
import { GitCommitIcon, SearchIcon } from "@primer/octicons-react";
import { Box, Label, Spinner, Text, TextInput } from "@primer/react";
import { useMemo, useState } from "react";

import { useGraph, useOverview } from "../api/queries";
import { useRepoView } from "../app/RepoViewContext";
import { Avatar } from "../components/Avatar";
import { CommitDetails } from "../components/CommitDetails";
import { HashLink } from "../components/Hash";
import { reachableCommits } from "../graph/reachable";
import { relativeTime } from "../lib/format";

const COL = { author: 150, commit: 96, when: 84 };

export function HistoryPage() {
  const graph = useGraph();
  const overview = useOverview();
  const { selectedBranch } = useRepoView();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeBranch = selectedBranch ?? overview.data?.currentBranch ?? null;

  const { commits, refsByCommit, headCommit } = useMemo(() => {
    const all = graph.data?.commits ?? [];
    const refs = graph.data?.refs ?? [];
    const tip = refs.find((r) => r.name === activeBranch)?.target ?? null;

    const byCommit = new Map<string, RefDTO[]>();
    for (const ref of refs) {
      const list = byCommit.get(ref.target) ?? [];
      list.push(ref);
      byCommit.set(ref.target, list);
    }

    let list = reachableCommits(all, tip);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.message.toLowerCase().includes(q) ||
          c.author.name.toLowerCase().includes(q) ||
          c.id.startsWith(q),
      );
    }
    const head = graph.data?.head;
    return {
      commits: list,
      refsByCommit: byCommit,
      headCommit: head && "commit" in head ? head.commit : null,
    };
  }, [graph.data, activeBranch, query]);

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

  const selected: CommitDTO | null =
    commits.find((c) => c.id === selectedId) ?? commits[0] ?? null;

  return (
    <Box sx={{ height: "100%", display: "flex", minHeight: 0 }}>
      {/* Master list */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            px: 4,
            py: 3,
            borderBottom: "1px solid",
            borderColor: "border.default",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Text sx={{ fontSize: 3, fontWeight: 600, display: "block" }}>History</Text>
            <Text sx={{ fontSize: 0, color: "fg.muted" }}>
              {commits.length} commits{activeBranch ? ` on ${activeBranch}` : ""}
            </Text>
          </Box>
          <TextInput
            leadingVisual={SearchIcon}
            placeholder="Filter commits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            sx={{ width: 240 }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            px: 4,
            py: "6px",
            fontSize: 0,
            fontWeight: 600,
            letterSpacing: "0.03em",
            color: "fg.muted",
            borderBottom: "1px solid",
            borderColor: "border.default",
            bg: "canvas.subtle",
          }}
        >
          <Box sx={{ flex: 1 }}>SUBJECT</Box>
          <Box sx={{ width: COL.author }}>AUTHOR</Box>
          <Box sx={{ width: COL.commit }}>COMMIT</Box>
          <Box sx={{ width: COL.when, textAlign: "right" }}>WHEN</Box>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {commits.map((c) => {
            const isSelected = selected?.id === c.id;
            return (
              <Box
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 4,
                  py: 2,
                  cursor: "pointer",
                  borderBottom: "1px solid",
                  borderColor: "border.muted",
                  borderLeft: "2px solid",
                  borderLeftColor: isSelected ? "accent.emphasis" : "transparent",
                  bg: isSelected ? "accent.subtle" : "transparent",
                  "&:hover": { bg: isSelected ? "accent.subtle" : "canvas.subtle" },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box sx={{ color: "fg.muted", display: "flex" }}>
                    <GitCommitIcon size={15} />
                  </Box>
                  <Text
                    sx={{
                      fontSize: 1,
                      fontWeight: c.id === headCommit ? 600 : 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                    title={c.message.split("\n")[0]}
                  >
                    {c.message.split("\n")[0]}
                  </Text>
                  {(refsByCommit.get(c.id) ?? []).map((ref) => (
                    <Label key={ref.name} variant="accent">
                      {ref.name}
                    </Label>
                  ))}
                </Box>
                <Box
                  sx={{
                    width: COL.author,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Avatar name={c.author.name} size={18} />
                  <Text
                    sx={{
                      fontSize: 0,
                      color: "fg.muted",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.author.name}
                  </Text>
                </Box>
                <Box sx={{ width: COL.commit }}>
                  <HashLink id={c.id} />
                </Box>
                <Text
                  sx={{
                    width: COL.when,
                    textAlign: "right",
                    fontSize: 0,
                    color: "fg.muted",
                  }}
                >
                  {relativeTime(c.timestamp)}
                </Text>
              </Box>
            );
          })}
          {commits.length === 0 && (
            <Box sx={{ p: 4, color: "fg.muted", fontSize: 1 }}>No commits match.</Box>
          )}
        </Box>
      </Box>

      {/* Detail */}
      <Box
        sx={{
          width: 360,
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
            refs={(refsByCommit.get(selected.id) ?? []).map((r) => r.name)}
            isHead={selected.id === headCommit}
          />
        ) : (
          <Text sx={{ color: "fg.muted", fontSize: 1 }}>Select a commit.</Text>
        )}
      </Box>
    </Box>
  );
}
