import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { ElkExtendedEdge } from "elkjs/lib/elk-api";
import { useMemo } from "react";

export type SplineEdgeData = {
  elkEdge: ElkExtendedEdge;
};

export function SplineEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  ...props
}: EdgeProps<Edge<SplineEdgeData>>) {
  const elkEdge = data?.elkEdge;

  const edgePath = useMemo(() => {
    if (elkEdge?.sections) {
      return elkEdge.sections
        .map((section) => {
          const { startPoint, endPoint } = section;
          const startX = startPoint.x ?? 0;
          const startY = startPoint.y ?? 0;
          const endX = endPoint.x ?? 0;
          const endY = endPoint.y ?? 0;
          return `M${startX},${startY} C${startX},${endY} ${endX},${startY} ${endX},${endY}`;
        })
        .join(" ");
    } else {
      const [path] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });

      return path;
    }
  }, [sourceX, sourceY, targetX, targetY, elkEdge]);

  elkEdge?.labels?.forEach((label) => {
    console.log(label);
  });

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={props.style}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
      />
      <EdgeLabelRenderer>
        {elkEdge?.labels?.map((label, index) => (
          <div
            key={label.id ?? index}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)`,
              pointerEvents: "all",
              width: label.width ? `${label.width}px` : undefined,
              height: label.height ? `${label.height}px` : undefined,
              backgroundColor: "white",
            }}
          >
            {label.text}
          </div>
        ))}
      </EdgeLabelRenderer>
    </>
  );
}

export type TypedEdge<
  EdgeData extends Record<string, unknown>,
  EdgeType extends string
> = Omit<Edge<EdgeData>, "type"> & {
  type: EdgeType;
};

export type SplineEdge = TypedEdge<SplineEdgeData, "spline">;

export type EdgeTypes = SplineEdge;

export const edgeTypes = {
  spline: SplineEdge,
};
