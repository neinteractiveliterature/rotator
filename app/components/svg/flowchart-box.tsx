export type FlowchartBoxProps = {
  children?: React.ReactNode;
  width: number;
  height: number;
  x: number;
  y: number;
  fontSize?: number;
};

export default function FlowchartBox({
  children,
  x,
  y,
  width,
  height,
  fontSize = 1,
}: FlowchartBoxProps) {
  return (
    <svg width={width} height={height} x={x} y={y}>
      <rect
        width="100%"
        height="100%"
        style={{ fill: "white", stroke: "black", strokeWidth: 0.2 }}
      />
      <foreignObject width="100%" height="100%">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${fontSize}px`,
            fontFamily: "sans-serif",
            height: "100%",
            width: "100%",
            padding: "0.5px",
            overflow: "hidden",
          }}
        >
          <div style={{ textAlign: "center" }}>{children}</div>
        </div>
      </foreignObject>
    </svg>
  );
}
