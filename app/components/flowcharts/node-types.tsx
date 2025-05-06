import { Handle, Position, type Node } from "@xyflow/react";
import type { BootstrapIconProps } from "../bootstrap-icon";
import BootstrapIcon from "../bootstrap-icon";

export type LabelWithIconNodeData = {
  label: React.ReactNode;
  icon?: BootstrapIconProps["name"];
};

export function LabelWithIconNode({ data }: { data: LabelWithIconNodeData }) {
  return (
    <div
      className="rounded border border-2 border-dark p-2 shadow-sm"
      style={{ maxWidth: "8em" }}
    >
      <Handle type="target" position={Position.Left} className="invisible" />
      {data.icon && (
        <div className="float-end ms-2">
          <BootstrapIcon name={data.icon} />
        </div>
      )}
      {data.label}
      <Handle type="source" position={Position.Right} className="invisible" />
    </div>
  );
}

export type TypedNode<
  NodeData extends Record<string, unknown>,
  NodeType extends string
> = Omit<Node<NodeData>, "type"> & {
  type: NodeType;
};

export type LabelWithIconNode = TypedNode<
  LabelWithIconNodeData,
  "labelWithIcon"
>;

export type NodeTypes = LabelWithIconNode;

export const nodeTypes = {
  labelWithIcon: LabelWithIconNode,
};
