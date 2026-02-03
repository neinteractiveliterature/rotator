import { useId, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export type FlowItem = {
  content: React.ReactNode;
  branches?: FlowItemBranch[];
};

export type FlowItemBranch = {
  items: FlowItem[];
};

export type FlowListProps = {
  items: FlowItem[];
  arrowColor?: string;
  arrowSize?: number;
};

function ArrowheadMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 5 8"
      refX="5"
      refY="4"
      markerWidth="4"
      markerHeight="10"
      orient="auto"
    >
      <path d="M 0 0 L 5 4 L 0 8 z" fill={color} />
    </marker>
  );
}

// Small SVG for arrow pointing down (between siblings)
function DownArrow({
  arrowheadId,
  color = "#374151",
  x = 10,
}: {
  arrowheadId?: string;
  color?: string;
  x?: number;
}) {
  return (
    <line
      x1={x}
      y1="0"
      x2={x}
      y2="100%"
      stroke={color}
      strokeWidth="2"
      markerEnd={arrowheadId ? `url(#${arrowheadId})` : undefined}
    />
  );
}

// Small SVG for curved arrow branching right (to children)
function BranchArrow({
  color = "#374151",
  startX = 10,
  endX = 30,
  height = 30,
  arrowheadId,
}: {
  arrowheadId: string;
  color?: string;
  startX?: number;
  endX?: number;
  height?: number;
}) {
  const downDistance = height * 0.5;
  const curveStartY = downDistance;
  const endY = height;

  return (
    <path
      d={`M ${startX} 0 L ${startX} ${curveStartY} Q ${startX} ${endY}, ${endX} ${endY}`}
      stroke={color}
      strokeWidth="2"
      fill="none"
      markerEnd={`url(#${arrowheadId})`}
    />
  );
}

type FlowArrowType = "DOWN" | "BRANCH_WITH_DOWN" | "BRANCH_WITHOUT_DOWN";

function FlowArrow({ type, color }: { type: FlowArrowType; color: string }) {
  const arrowheadId = useId();
  const lineBackground = useMemo(
    () =>
      renderToStaticMarkup(
        <svg width="30" height="100" xmlns="http://www.w3.org/2000/svg">
          <DownArrow color={color} />
        </svg>,
      ),
    [color],
  );

  return (
    <div
      style={{
        backgroundImage:
          type === "BRANCH_WITH_DOWN"
            ? `url(data:image/svg+xml;utf8,${encodeURIComponent(lineBackground)})`
            : undefined,
        marginLeft: "1rem",
      }}
    >
      <svg
        width={30}
        height={type === "DOWN" ? 20 : 40}
        style={{
          display: "block",
        }}
      >
        <defs>
          <ArrowheadMarker id={arrowheadId} color={color} />
        </defs>
        {type === "DOWN" && (
          <DownArrow arrowheadId={arrowheadId} color={color} />
        )}
        {type !== "DOWN" && (
          <BranchArrow arrowheadId={arrowheadId} color={color} />
        )}
      </svg>
    </div>
  );
}

export default function FlowList({
  items,
  arrowColor = "#374151",
  arrowSize = 20,
}: FlowListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, index) => (
        <div key={index}>
          <div>{item.content}</div>

          {item.branches?.map((branch, branchIndex) => (
            <div
              style={{
                display: "grid",
                gridTemplateRows: "1fr",
                gridTemplateColumns: "min-content 1fr",
              }}
              key={branchIndex}
            >
              <FlowArrow
                type={
                  branchIndex < (item.branches?.length ?? 0) - 1
                    ? "BRANCH_WITH_DOWN"
                    : "BRANCH_WITHOUT_DOWN"
                }
                color={arrowColor}
              />

              <div style={{ marginTop: "1rem" }}>
                <FlowList
                  items={branch.items}
                  arrowColor={arrowColor}
                  arrowSize={arrowSize}
                />
              </div>
            </div>
          ))}

          {index < items.length - 1 && (
            <FlowArrow color={arrowColor} type="DOWN" />
          )}
        </div>
      ))}
    </div>
  );
}
