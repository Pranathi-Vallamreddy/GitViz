import { DatabaseIcon, GitBranchIcon, GitCommitIcon } from "@primer/octicons-react";
import { Box, Heading, Text, TextInput } from "@primer/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useGraph } from "../api/queries";
import { HashLink } from "../components/Hash";
import { shortHash } from "../lib/format";

/**
 * Launchpad into the object store: jump to any object by hash, or follow a
 * branch tip / recent commit into the Merkle DAG.
 */
export function ObjectsPage() {
  const graph = useGraph();
  const navigate = useNavigate();
  const [hash, setHash] = useState("");

  const refs = graph.data?.refs ?? [];
  const commits = graph.data?.commits.slice(0, 8) ?? [];

  return (
    <Box sx={{ p: 4, maxWidth: 760, display: "flex", flexDirection: "column", gap: 4 }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <DatabaseIcon size={20} />
          <Heading as="h2" sx={{ fontSize: 3 }}>
            Objects
          </Heading>
        </Box>
        <Text sx={{ color: "fg.muted", fontSize: 1 }}>
          Every commit, tree, and blob is stored by the SHA-256 of its content. Open one
          to follow the hashes.
        </Text>
      </Box>

      <Box
        as="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          if (hash.trim()) navigate(`/objects/${hash.trim()}`);
        }}
        sx={{ display: "flex", gap: 2 }}
      >
        <TextInput
          monospace
          block
          placeholder="Paste an object hash…"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Text sx={{ fontWeight: "bold", fontSize: 1, display: "block", mb: 2 }}>
            Branch tips
          </Text>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {refs.map((ref) => (
              <Box key={ref.name} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <GitBranchIcon size={14} />
                <Text sx={{ flex: 1, fontSize: 1 }}>{ref.name}</Text>
                <HashLink id={ref.target} />
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Text sx={{ fontWeight: "bold", fontSize: 1, display: "block", mb: 2 }}>
            Recent commits
          </Text>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {commits.map((commit) => (
              <Box key={commit.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <GitCommitIcon size={14} />
                <Text
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={commit.message.split("\n")[0]}
                >
                  {commit.message.split("\n")[0]}
                </Text>
                <HashLink id={commit.id} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Text sx={{ fontSize: 0, color: "fg.muted" }}>
        Tip: short hashes shown as {commits[0] ? shortHash(commits[0].id) : "abcd1234"}{" "}
        link to the full object.
      </Text>
    </Box>
  );
}
