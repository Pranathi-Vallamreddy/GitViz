import { Box, Heading, Spinner, Text } from "@primer/react";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraph } from "../api/queries";
import { laneColor } from "./colors";
import { CommitNode, COMMIT_NODE_WIDTH, type CommitNodeData } from "./CommitNode";
import { layoutGraph } from "./layout";

// Stable identity so React Flow doesn't re-register node types each render.
const nodeTypes = { commit: CommitNode };

const ROW_HEIGHT = 84;
const COLUMN_WIDTH = COMMIT_NODE_WIDTH + 60;

/** Centers a message in the available space (loading / error / empty states). */
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        color: "fg.muted",
      }}
    >
      {children}
    </Box>
  );
}

/**
 * The commit-graph view: fetches `/api/graph`, runs the pure `layoutGraph`, and
 * renders the result with React Flow. Owns its own loading / error / empty
 * states and a Refresh control.
 */
export function CommitGraph() {
  const { data, isPending, isError, error } = useGraph();

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node<CommitNodeData>[], edges: [] as Edge[] };

    const layout = layoutGraph(data, {
      rowHeight: ROW_HEIGHT,
      columnWidth: COLUMN_WIDTH,
    });
    const colorById = new Map(layout.nodes.map((n) => [n.id, laneColor(n.lane)]));

    const rfNodes: Node<CommitNodeData>[] = layout.nodes.map((n) => ({
      id: n.id,
      type: "commit",
      position: { x: n.x, y: n.y },
      data: {
        shortId: n.id.slice(0, 8),
        subject: n.commit.message.split("\n")[0] ?? "",
        author: n.commit.author.name,
        isHead: n.isHead,
        refs: n.refs.map((r) => r.name),
        color: colorById.get(n.id)!,
      },
    }));

    const rfEdges: Edge[] = layout.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      style: { stroke: colorById.get(e.source) ?? "#6e7681", strokeWidth: 2 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [data]);

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <Box sx={{ height: "100%" }}>
        {isPending ? (
          <Centered>
            <Spinner />
            <Text>Loading commit graph…</Text>
          </Centered>
        ) : isError ? (
          <Centered>
            <Text sx={{ color: "danger.fg" }}>Failed to load graph</Text>
            <Text sx={{ fontSize: 0 }}>{error.message}</Text>
          </Centered>
        ) : nodes.length === 0 ? (
          <Centered>
            <Heading as="h2" sx={{ fontSize: 3, color: "fg.default" }}>
              No commits yet
            </Heading>
            <Text>
              Create one with <Text sx={{ fontFamily: "mono" }}>gitviz commit -m …</Text>,
              then Refresh.
            </Text>
          </Centered>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} color="#30363d" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => (n.data as CommitNodeData).color}
              nodeStrokeColor={(n) => (n.data as CommitNodeData).color}
              maskColor="rgba(1, 4, 9, 0.6)"
              style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
            />
          </ReactFlow>
        )}
      </Box>
    </Box>
  );
}
