import {
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { useCallback, useMemo, type ComponentProps } from "react";
import ELK, {
  type ElkLabel,
  type ElkNode,
  type LayoutOptions,
} from "elkjs/lib/elk.bundled.js";

import "@xyflow/react/dist/style.css";
import { nodeTypes, type NodeTypes } from "./node-types";
import type { UnpositionedNode } from "./build-graph";
import { edgeTypes, SplineEdge } from "./edge-types";

const elk = new ELK();
const defaultOptions: LayoutOptions = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "SPLINES",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "60",
  "elk.layered.feedbackEdges": "true",
  "elk.spacing.nodeNode": "40",
};

const useLayoutedElements = () => {
  const { getNodes, setNodes, getEdges, setEdges, fitView } = useReactFlow();

  const getLayoutedElements = useCallback(
    async (options?: LayoutOptions) => {
      const layoutOptions = { ...defaultOptions, ...options };
      const nodes = getNodes();
      const edges = getEdges();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const graph: ElkNode = {
        id: "root",
        layoutOptions: layoutOptions,
        children: nodes.map((node) => ({
          ...node,
          width: node.measured?.width,
          height: node.measured?.height,
        })),
        edges: edges.map((edge) => {
          const measuredLabel = edge.label
            ? context?.measureText(edge.label.toString())
            : undefined;
          return {
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            labels: edge.label
              ? [
                  {
                    text: edge.label.toString(),
                    width: measuredLabel?.width,
                    height: measuredLabel?.actualBoundingBoxAscent,
                  } satisfies ElkLabel,
                ]
              : undefined,
          };
        }),
      };

      const result = await elk.layout(graph);
      const resultNodesById = Object.fromEntries(
        (result.children ?? []).map((node) => [node.id, node])
      );
      const resultEdgesById = Object.fromEntries(
        (result.edges ?? []).map((edge) => [edge.id, edge])
      );

      setNodes(
        nodes.map((node) => {
          const resultNode = resultNodesById[node.id];
          if (resultNode) {
            return {
              ...node,
              position: { x: resultNode.x ?? 0, y: resultNode.y ?? 0 },
            };
          } else {
            return node;
          }
        })
      );

      setEdges(
        edges.map((edge) => {
          const resultEdge = resultEdgesById[edge.id];
          if (resultEdge) {
            return {
              ...edge,
              type: "spline",
              data: { elkEdge: resultEdge },
            } satisfies SplineEdge;
          }
          return edge;
        })
      );

      fitView();
    },
    [getEdges, getNodes, setNodes, setEdges, fitView]
  );

  return { getLayoutedElements };
};

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
  const [nodes, , onNodesChange] = useNodesState(initialNodesWithPosition);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { getLayoutedElements } = useLayoutedElements();

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
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
      onInit={() => getLayoutedElements()}
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
