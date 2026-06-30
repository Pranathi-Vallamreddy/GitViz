import { Box, Text } from "@primer/react";
import { Handle, Position, type NodeProps } from "reactflow";

import { Avatar } from "../components/Avatar";

/** Data carried by each commit node (produced in CommitGraph from the layout). */
export interface CommitNodeData {
  shortId: string;
  subject: string;
  author: string;
  isHead: boolean;
  selected: boolean;
  /** Branch short names pointing at this commit. */
  refs: string[];
  /** Lane color, used for the left accent stripe and dot. */
  color: string;
}

export const COMMIT_NODE_WIDTH = 212;
export const COMMIT_NODE_HEIGHT = 38;

function ring(data: CommitNodeData): string {
  if (data.selected) return "0 0 0 2px var(--color-accent-emphasis)";
  if (data.isHead) return "0 0 0 1px var(--color-severe-emphasis)";
  return "none";
}

/**
 * A compact, information-dense commit chip (GitKraken-style): a lane-colored
 * dot, abbreviated hash, message, an optional branch tag, and the author's
 * avatar — sized to keep the graph tight rather than a big floating card.
 */
export function CommitNode({ data }: NodeProps<CommitNodeData>) {
  const tag = data.isHead ? "HEAD" : data.refs[0];
  return (
    <Box
      sx={{
        width: COMMIT_NODE_WIDTH,
        height: COMMIT_NODE_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        px: "8px",
        bg: data.selected ? "accent.subtle" : "canvas.subtle",
        border: "1px solid",
        borderColor: data.selected ? "accent.emphasis" : "border.default",
        borderRadius: 6,
        boxShadow: ring(data),
        cursor: "pointer",
        overflow: "hidden",
        "&:hover": { borderColor: "accent.emphasis" },
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flexShrink: 0,
          bg: data.color,
        }}
      />
      <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted", flexShrink: 0 }}>
        {data.shortId.slice(0, 7)}
      </Text>
      <Text
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: 0,
          color: "fg.default",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={data.subject}
      >
        {data.subject}
      </Text>
      {tag && (
        <Box
          sx={{
            flexShrink: 0,
            maxWidth: 64,
            px: "5px",
            height: 16,
            display: "flex",
            alignItems: "center",
            borderRadius: 10,
            fontSize: "10px",
            fontWeight: 600,
            bg: data.isHead ? "severe.subtle" : "accent.subtle",
            color: data.isHead ? "severe.fg" : "accent.fg",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tag}
        </Box>
      )}
      <Avatar name={data.author} size={16} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Box>
  );
}
