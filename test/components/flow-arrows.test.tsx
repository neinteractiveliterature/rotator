import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import FlowList, { type FlowItem } from "~/components/flow-arrows";

const item = (label: string, branches?: FlowItem["branches"]): FlowItem => ({
  content: <span>{label}</span>,
  branches,
});

// Each arrow is an <svg>; a "down" arrow is 20 tall and a branch arrow 40
const arrows = (container: HTMLElement) => ({
  down: container.querySelectorAll('svg[height="20"]').length,
  branch: container.querySelectorAll('svg[height="40"]').length,
});

describe("FlowList", () => {
  test("shows each item's content in order", () => {
    const { container } = render(<FlowList items={[item("one"), item("two"), item("three")]} />);
    expect([...container.querySelectorAll("span")].map((span) => span.textContent)).toEqual(["one", "two", "three"]);
  });

  test("puts a down arrow between items, but not after the last", () => {
    const { container } = render(<FlowList items={[item("one"), item("two"), item("three")]} />);
    expect(arrows(container)).toEqual({ down: 2, branch: 0 });
  });

  test("a single item has no arrows", () => {
    const { container } = render(<FlowList items={[item("only")]} />);
    expect(arrows(container)).toEqual({ down: 0, branch: 0 });
  });

  test("each branch gets a branch arrow and its own list; the last branch doesn't continue the line down", () => {
    const { container } = render(
      <FlowList
        items={[
          item("start", [
            { items: [item("a1"), item("a2")] },
            { items: [item("b1")] },
          ]),
        ]}
      />,
    );

    const labels = [...container.querySelectorAll("span")].map((span) => span.textContent);
    expect(labels).toEqual(["start", "a1", "a2", "b1"]);
    // two branch arrows, plus the down arrow between a1 and a2
    expect(arrows(container)).toEqual({ down: 1, branch: 2 });
    // the first branch (with another after it) draws the vertical line behind its arrow; the last doesn't
    const withLine = [...container.querySelectorAll("div")].filter((div) =>
      div.style.backgroundImage.includes("data:image/svg+xml"),
    );
    expect(withLine).toHaveLength(1);
  });

  test("branches nest", () => {
    const { container } = render(
      <FlowList
        items={[item("root", [{ items: [item("child", [{ items: [item("grandchild")] }])] }])]}
      />,
    );
    expect([...container.querySelectorAll("span")].map((span) => span.textContent)).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
    expect(arrows(container)).toEqual({ down: 0, branch: 2 });
  });

  test("draws the arrows in the given color", () => {
    const { container } = render(<FlowList items={[item("one"), item("two")]} arrowColor="#ff0000" />);
    expect(container.querySelector("line")?.getAttribute("stroke")).toBe("#ff0000");
  });
});
