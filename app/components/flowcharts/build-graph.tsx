import type { ParseKeys, TFunction } from "i18next";
import type { BootstrapIconProps } from "../bootstrap-icon";
import type { Edge, Node } from "@xyflow/react";
import type { LabelWithIconNode, NodeTypes } from "./node-types";

type KeysWithPrefix<Prefix extends string> = Extract<
  ParseKeys,
  `${Prefix}${string}`
>;

type SuffixesFor<Prefix extends string> =
  KeysWithPrefix<Prefix> extends `${Prefix}${infer Suffix}` ? Suffix : never;

export type UnpositionedNode<NodeType extends Node> = Omit<
  NodeType,
  "position"
>;

function labelWithIconNode<
  Prefix extends string,
  ID extends SuffixesFor<`${Prefix}nodes.`>
>({
  id,
  prefix,
  icon,
  t,
}: {
  id: ID;
  prefix: Prefix;
  icon?: BootstrapIconProps["name"];
  t: TFunction;
}): Omit<LabelWithIconNode, "position"> {
  return {
    id,
    type: "labelWithIcon",
    data: {
      label: t(`${prefix}nodes.${id}` as KeysWithPrefix<Prefix>),
      icon,
    },
  };
}

export type BuildNodesHelpers<Prefix extends string> = {
  labelWithIcon: ({
    id,
    icon,
  }: {
    id: SuffixesFor<`${Prefix}nodes.`>;
    icon?: BootstrapIconProps["name"];
  }) => UnpositionedNode<LabelWithIconNode>;
};

export function buildNodes<Prefix extends string>(
  t: TFunction,
  prefix: Prefix,
  build: (helpers: BuildNodesHelpers<Prefix>) => UnpositionedNode<NodeTypes>[]
) {
  const labelWithIcon = ({
    id,
    icon,
  }: {
    id: SuffixesFor<`${Prefix}nodes.`>;
    icon?: BootstrapIconProps["name"];
  }) => labelWithIconNode({ id, prefix, icon, t });

  return build({ labelWithIcon });
}

export function buildEdge<Prefix extends string>({
  source,
  target,
  t,
  prefix,
  labelId,
}: {
  source: string;
  target: string;
  t: TFunction;
  prefix: Prefix;
  labelId?: SuffixesFor<`${Prefix}edges.`>;
}): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    label: labelId
      ? (t(
          `${prefix}edges.${labelId}` as KeysWithPrefix<`${Prefix}edges.`>
        ) as string)
      : undefined,
  };
}

export type BuildEdgesHelpers<Prefix extends string> = {
  edge: ({
    source,
    target,
    labelId,
  }: {
    source: string;
    target: string;
    labelId?: SuffixesFor<`${Prefix}edges.`>;
  }) => Edge;
};

export function buildEdges<Prefix extends string>(
  t: TFunction,
  prefix: Prefix,
  build: (helpers: BuildEdgesHelpers<Prefix>) => Edge[]
) {
  const edge = ({
    source,
    target,
    labelId,
  }: {
    source: string;
    target: string;
    labelId?: SuffixesFor<`${Prefix}edges.`>;
  }) => buildEdge({ source, target, t, prefix, labelId });

  return build({ edge });
}

export function buildGraph<Prefix extends string>(
  t: TFunction,
  prefix: Prefix,
  nodesBuilder: (
    helpers: BuildNodesHelpers<Prefix>
  ) => UnpositionedNode<NodeTypes>[],
  edgesBuilder: (helpers: BuildEdgesHelpers<Prefix>) => Edge[]
) {
  return {
    nodes: buildNodes(t, prefix, nodesBuilder),
    edges: buildEdges(t, prefix, edgesBuilder),
  };
}
