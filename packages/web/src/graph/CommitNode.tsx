import { Box, Label, Text } from "@primer/react";
import { Handle, Position, type NodeProps } from "reactflow";

/** Data carried by each commit node (produced in CommitGraph from the layout). */
export interface CommitNodeData {
  shortId: string;
  subject: string;
  author: string;
  isHead: boolean;
  /** Whether this node is the currently selected one. */
  selected: boolean;
  /** Branch short names pointing at this commit. */
  refs: string[];
  /** Lane color, used for the left accent stripe. */
  color: string;
}

function nodeShadow(data: CommitNodeData): string {
  if (data.selected) return "0 0 0 2px var(--color-accent-emphasis)";
  if (data.isHead) return "0 0 0 2px var(--color-attention-emphasis)";
  return "var(--color-shadow-medium)";
}

export const COMMIT_NODE_WIDTH = 230;

/**
 * A single commit, rendered as a card: a lane-colored stripe, any branch labels,
 * a HEAD badge, the abbreviated hash, and the commit subject. Connection handles
 * are present but visually hidden — edges attach to the top (parent side) and
 * bottom (child side).
 */
export function CommitNode({ data }: NodeProps<CommitNodeData>) {
  return (
    <Box
      sx={{
        width: COMMIT_NODE_WIDTH,
        display: "flex",
        bg: "canvas.subtle",
        borderRadius: 2,
        borderLeft: "4px solid",
        borderColor: data.isHead ? "attention.emphasis" : data.color,
        boxShadow: nodeShadow(data),
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Box sx={{ p: 2, minWidth: 0, flex: 1 }}>
        <Box
          sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1, flexWrap: "wrap" }}
        >
          {data.isHead && (
            <Label variant="attention" size="small">
              HEAD
            </Label>
          )}
          {data.refs.map((name) => (
            <Label key={name} variant="accent" size="small">
              {name}
            </Label>
          ))}
          <Text sx={{ fontFamily: "mono", fontSize: 0, color: "fg.muted", ml: "auto" }}>
            {data.shortId}
          </Text>
        </Box>
        <Text
          sx={{
            fontSize: 1,
            color: "fg.default",
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.subject}
        </Text>
        <Text sx={{ fontSize: 0, color: "fg.muted" }}>{data.author}</Text>
      </Box>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Box>
  );
}
