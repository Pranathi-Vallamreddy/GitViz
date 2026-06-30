import { DatabaseIcon, SearchIcon } from "@primer/octicons-react";
import { Box, Label, Spinner, Text, TextInput } from "@primer/react";
import { useMemo, useState } from "react";

import { useGraph } from "../api/queries";
import { HashLink } from "../components/Hash";
import { ObjectView } from "../components/ObjectView";
import { shortHash } from "../lib/format";

type ObjType = "commit" | "tree" | "blob";

interface ObjRow {
  hash: string;
  name: string;
  type: ObjType;
}

const TYPE_LABEL: Record<ObjType, "done" | "attention" | "accent"> = {
  commit: "done",
  tree: "attention",
  blob: "accent",
};

const FILTERS = ["all", "commit", "tree"] as const;
type Filter = (typeof FILTERS)[number];

export function ObjectsPage() {
  const graph = useGraph();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [jump, setJump] = useState("");

  // Objects we can enumerate cheaply without a new endpoint: every commit, and
  // each commit's (deduplicated) root tree. Deeper trees/blobs are reachable by
  // following hash links into the inspector.
  const rows = useMemo<ObjRow[]>(() => {
    const commits = graph.data?.commits ?? [];
    const out: ObjRow[] = commits.map((c) => ({
      hash: c.id,
      name: c.message.split("\n")[0] ?? "",
      type: "commit",
    }));
    const seenTrees = new Set<string>();
    for (const c of commits) {
      if (!seenTrees.has(c.tree)) {
        seenTrees.add(c.tree);
        out.push({ hash: c.tree, name: "root tree", type: "tree" });
      }
    }
    return out;
  }, [graph.data]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      commit: rows.filter((r) => r.type === "commit").length,
      tree: rows.filter((r) => r.type === "tree").length,
    }),
    [rows],
  );

  const visible = filter === "all" ? rows : rows.filter((r) => r.type === filter);
  const activeHash = selected ?? visible[0]?.hash ?? null;

  if (graph.isPending) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", minHeight: 0 }}>
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            <DatabaseIcon size={18} />
            <Text sx={{ fontSize: 3, fontWeight: 600 }}>Object Explorer</Text>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {FILTERS.map((f) => (
              <Box
                key={f}
                onClick={() => setFilter(f)}
                sx={{
                  px: 2,
                  py: "4px",
                  borderRadius: 6,
                  fontSize: 0,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  bg: filter === f ? "accent.subtle" : "transparent",
                  color: filter === f ? "accent.fg" : "fg.muted",
                  fontWeight: filter === f ? 600 : 400,
                  "&:hover": { bg: filter === f ? "accent.subtle" : "canvas.subtle" },
                }}
              >
                {f === "all" ? "All" : `${f}s`}{" "}
                <Text sx={{ fontFamily: "mono", color: "fg.muted" }}>{counts[f]}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{ px: 4, py: 2, borderBottom: "1px solid", borderColor: "border.default" }}
        >
          <Box
            as="form"
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              if (jump.trim()) setSelected(jump.trim());
            }}
          >
            <TextInput
              monospace
              block
              size="small"
              leadingVisual={SearchIcon}
              placeholder="Open object by hash (full or abbreviated)…"
              value={jump}
              onChange={(e) => setJump(e.target.value)}
            />
          </Box>
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
            bg: "canvas.subtle",
            borderBottom: "1px solid",
            borderColor: "border.default",
            position: "sticky",
            top: 0,
          }}
        >
          <Box sx={{ width: 96 }}>SHA</Box>
          <Box sx={{ flex: 1 }}>NAME</Box>
          <Box sx={{ width: 80 }}>TYPE</Box>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {visible.map((row) => {
            const isSel = activeHash === row.hash;
            return (
              <Box
                key={row.hash}
                onClick={() => setSelected(row.hash)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 4,
                  py: 2,
                  cursor: "pointer",
                  borderBottom: "1px solid",
                  borderColor: "border.muted",
                  borderLeft: "2px solid",
                  borderLeftColor: isSel ? "accent.emphasis" : "transparent",
                  bg: isSel ? "accent.subtle" : "transparent",
                  "&:hover": { bg: isSel ? "accent.subtle" : "canvas.subtle" },
                }}
              >
                <Box sx={{ width: 96 }}>
                  <HashLink id={row.hash} />
                </Box>
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
                  {row.name}
                </Text>
                <Box sx={{ width: 80 }}>
                  <Label variant={TYPE_LABEL[row.type]}>{row.type}</Label>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          width: 380,
          flexShrink: 0,
          borderLeft: "1px solid",
          borderColor: "border.default",
          bg: "canvas.default",
          overflow: "auto",
          p: 4,
        }}
      >
        {activeHash ? (
          <ObjectView hash={activeHash} />
        ) : (
          <Text sx={{ color: "fg.muted", fontSize: 1 }}>
            Tip: short hashes like {shortHash(rows[0]?.hash ?? "abcd1234")} link to the
            full object.
          </Text>
        )}
      </Box>
    </Box>
  );
}
