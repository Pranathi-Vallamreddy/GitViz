import type { GraphDTO } from "@gitviz/shared";
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
import { CommitNode, COMMIT_NODE_WIDTH, type CommitNodeData } from "./CommitNode";
import { layoutGraph } from "./layout";

// Stable identity so React Flow doesn't re-register node types each render.
const nodeTypes = { commit: CommitNode };

const ROW_HEIGHT = 84;
const COLUMN_WIDTH = COMMIT_NODE_WIDTH + 60;

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
      style: { stroke: colorById.get(e.source) ?? "#6e7681", strokeWidth: 2 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph, selectedId]);

  return (
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
  );
}
