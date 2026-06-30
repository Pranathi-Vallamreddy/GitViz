import type { GraphDTO } from "@gitviz/shared";
import { Box } from "@primer/react";
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

import { laneColor } from "./colors";
import {
  CommitNode,
  COMMIT_NODE_HEIGHT,
  COMMIT_NODE_WIDTH,
  type CommitNodeData,
} from "./CommitNode";
import { layoutGraph } from "./layout";

// Stable identity so React Flow doesn't re-register node types each render.
const nodeTypes = { commit: CommitNode };

// Tight spacing for a dense graph: rows just taller than a node, lanes only a
// little wider than a node so branches sit close together.
const ROW_HEIGHT = 52;
const COLUMN_WIDTH = COMMIT_NODE_WIDTH + 36;
const NODE_HEIGHT = COMMIT_NODE_HEIGHT;

interface CommitGraphProps {
  graph: GraphDTO;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Presentational commit-graph canvas. Given a {@link GraphDTO}, it runs the pure
 * `layoutGraph` and renders the result with React Flow. Data fetching, branch
 * filtering, and the detail panel live in the page that owns this component.
 */
export function CommitGraph({ graph, selectedId, onSelect }: CommitGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const layout = layoutGraph(graph, {
      rowHeight: ROW_HEIGHT,
      columnWidth: COLUMN_WIDTH,
    });
    const colorById = new Map(layout.nodes.map((n) => [n.id, laneColor(n.lane)]));

    const rfNodes: Node<CommitNodeData>[] = layout.nodes.map((n) => ({
      id: n.id,
      type: "commit",
      position: { x: n.x, y: n.y },
      width: COMMIT_NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        shortId: n.id.slice(0, 8),
        subject: n.commit.message.split("\n")[0] ?? "",
        author: n.commit.author.name,
        isHead: n.isHead,
        selected: n.id === selectedId,
        refs: n.refs.map((r) => r.name),
        color: colorById.get(n.id)!,
      },
    }));

    const rfEdges: Edge[] = layout.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      pathOptions: { borderRadius: 14 },
      style: { stroke: colorById.get(e.source) ?? "#6e7681", strokeWidth: 1.75 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph, selectedId]);

  // React Flow needs a parent with an explicit width and height to render.
  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
        minZoom={0.2}
        defaultEdgeOptions={{ type: "smoothstep" }}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_event, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
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
    </Box>
  );
}
