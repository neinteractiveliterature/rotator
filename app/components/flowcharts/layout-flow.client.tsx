import Dagre from "dagre";
import {
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useMemo, type ComponentProps } from "react";

import "@xyflow/react/dist/style.css";
import { nodeTypes, type NodeTypes } from "./node-types";
import type { UnpositionedNode } from "./build-graph";

function layoutElements<NodeType extends Node>(
  nodes: NodeType[],
  edges: Edge[],
  options: { direction: string }
) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      const x = position.x - (node.measured?.width ?? 0) / 2;
      const y = position.y - (node.measured?.height ?? 0) / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
}

export function LayoutFlow({
  initialNodes,
  initialEdges,
}: {
  initialNodes: UnpositionedNode<NodeTypes>[];
  initialEdges: Edge[];
}) {
  const initialNodesWithPosition = useMemo(
    () =>
      initialNodes.map((node) => ({
        ...node,
        position: { x: 0, y: 0 },
      })),
    [initialNodes]
  );
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodesWithPosition
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const recalculateLayout = useCallback(
    (direction: string) => {
      // we're using functional setters in order to avoid making nodes or edges a dependency
      // of the useCallback, which would cause an infinite loop
      setEdges((prevEdges) => {
        setNodes((prevNodes) => {
          const layouted = layoutElements(prevNodes, prevEdges, {
            direction,
          });
          return layouted.nodes;
        });

        // edges don't change, so we can just return the previous edges
        return prevEdges;
      });

      fitView();
    },
    [fitView, setNodes, setEdges]
  );

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      elementsSelectable={false}
      nodesConnectable={false}
      nodesDraggable={false}
      nodesFocusable={false}
      onInit={() => recalculateLayout("LR")}
      defaultEdgeOptions={{
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      }}
    ></ReactFlow>
  );
}

export default function WrappedLayoutFlow(
  props: ComponentProps<typeof LayoutFlow>
) {
  return (
    <ReactFlowProvider>
      <LayoutFlow {...props} />
    </ReactFlowProvider>
  );
}
