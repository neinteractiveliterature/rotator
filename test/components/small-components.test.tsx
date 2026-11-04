import { render, screen } from "@testing-library/react";
import { DrizzleQueryError } from "drizzle-orm";
import { I18nextProvider } from "react-i18next";
import { describe, expect, test } from "vitest";
import BootstrapIcon from "~/components/bootstrap-icon";
import { ErrorDisplay, serializeError } from "~/components/error-display";
import HighlightedText from "~/components/highlighted-text";
import { getSortableStyle } from "~/components/sortable-utils";
import i18n from "~/i18n";
import { loader as scheduleIndex } from "~/routes/schedules/indexRoute";

const withI18n = (ui: React.ReactNode) => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;

describe("ErrorDisplay", () => {
  test("shows nothing when there's no error", () => {
    const { container } = render(withI18n(<ErrorDisplay error={null} />));
    expect(container).toBeEmptyDOMElement();
  });

  test("shows an error's message, a paragraph per line", () => {
    render(withI18n(<ErrorDisplay error={new Error("First line\nSecond line")} />));
    expect(screen.getByText("First line")).toBeInTheDocument();
    expect(screen.getByText("Second line")).toBeInTheDocument();
    expect(screen.getAllByText(/line/)).toHaveLength(2);
  });

  test("says it's unknown for something that isn't an Error", () => {
    render(withI18n(<ErrorDisplay error="a string" />));
    expect(screen.getByText("Unknown error")).toBeInTheDocument();
  });
});

describe("serializeError", () => {
  const t = i18n.t.bind(i18n);

  test("passes an Error through", () => {
    const error = new Error("boom");
    expect(serializeError(error, t)).toBe(error);
  });

  test("makes an Error of anything else", () => {
    expect(serializeError("nope", t).message).toBe("Unknown error");
  });

  test("includes a database error's cause, which is where the useful part is", () => {
    const error = new DrizzleQueryError("insert into x", [], new Error('duplicate key value violates "unique"'));
    const message = serializeError(error, t).message;
    expect(message).toContain("insert into x");
    expect(message).toContain("Caused by:");
    expect(message).toContain("duplicate key value");
  });
});

describe("HighlightedText", () => {
  test("shows the text, with Liquid tags in their own spans", () => {
    const { container } = render(<HighlightedText text="Hello {{ name }}!" />);
    expect(container.textContent).toBe("Hello {{ name }}!");
    expect(container.querySelectorAll("span").length).toBeGreaterThan(1);
  });

  test("keeps line breaks", () => {
    const { container } = render(<HighlightedText text={"one\ntwo"} />);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });
});

describe("BootstrapIcon", () => {
  test("renders the named icon class", () => {
    const { container } = render(<BootstrapIcon name="telephone-fill" />);
    expect(container.querySelector("i")).toHaveClass("bi-telephone-fill");
  });
});

describe("getSortableStyle", () => {
  test("is plain when idle", () => {
    expect(getSortableStyle(null, undefined, false)).toEqual({
      transform: undefined,
      transition: undefined,
      opacity: undefined,
    });
  });

  test("follows the drag, dimming the dragged item", () => {
    const style = getSortableStyle({ x: 5, y: 10, scaleX: 1, scaleY: 1 }, "transform 200ms", true);
    expect(style.transform).toContain("translate3d(5px, 10px, 0)");
    expect(style.transition).toBe("transform 200ms");
    expect(style.opacity).toBe(0.5);
  });
});

describe("schedule index route", () => {
  test("sends you to the edit page", async () => {
    const response = await scheduleIndex();
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("./edit");
  });
});
