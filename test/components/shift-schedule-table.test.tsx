import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createRoutesStub } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { ShiftScheduleTable, type ShiftForSchedule } from "~/components/shift-scheduling";
import i18n from "~/i18n";

const responders = [
  { id: 1, name: "Alex", phoneNumber: "+12025550101", email: "alex@example.com" },
  { id: 2, name: "Blake", phoneNumber: "+12025550102", email: "blake@example.com" },
];

const hour = 60 * 60 * 1000;
const base = Date.UTC(2026, 5, 1, 12, 0, 0); // noon UTC
const at = (hours: number) => new Date(base + hours * hour);
const range = (startHour: number, finishHour: number) => ({
  start: at(startHour),
  finish: at(finishHour),
  includeStart: true,
  includeFinish: false,
});

// a four-hour schedule in UTC, with one two-hour shift in the middle
const schedule = {
  id: 1,
  name: "Weekend",
  timespan: range(0, 4),
  timeZone: "UTC",
} as Parameters<typeof ShiftScheduleTable>[0]["schedule"];

const shift: ShiftForSchedule = {
  id: 7,
  timespan: range(1, 3),
  shiftAssignments: [
    { id: 71, position: 2, responderId: 2, responder: { id: 2, name: "Blake" } },
    { id: 70, position: 1, responderId: 1, responder: { id: 1, name: "Alex" } },
  ],
};

type Submission = { method: string; path: string; body: unknown };

function renderTable({
  shifts = [shift],
  actionResult = null,
}: { shifts?: ShiftForSchedule[]; actionResult?: unknown } = {}) {
  const submissions: Submission[] = [];
  const record = async ({ request }: { request: Request }) => {
    const text = await request.text();
    submissions.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text ? JSON.parse(text) : null,
    });
    return actionResult;
  };
  const Stub = createRoutesStub([
    {
      path: "/schedules/1/shifts",
      action: record,
      Component: () => <ShiftScheduleTable shifts={shifts} schedule={schedule} responders={responders} />,
      children: [{ path: ":shiftId", action: record }],
    },
  ]);
  render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={["/schedules/1/shifts"]} />
    </I18nextProvider>,
  );
  return submissions;
}

describe("ShiftScheduleTable", () => {
  test("has a row per hour of the schedule", async () => {
    renderTable();
    await screen.findAllByRole("row");
    // header + 4 hours
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  test("shows who's on the shift in order, linked to their pages, once for the whole shift", async () => {
    renderTable();
    const links = await screen.findAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Alex", "/responders/1"],
      ["Blake", "/responders/2"],
    ]);
    expect(screen.getAllByRole("button", { name: /edit shift/i })).toHaveLength(1);
  });

  test("offers to add a shift in each uncovered hour", async () => {
    renderTable();
    await screen.findAllByRole("row");
    // hours 0 and 3 are uncovered
    expect(screen.getAllByRole("button", { name: /add shift/i })).toHaveLength(2);
  });

  test("with no shifts, every hour can have one added", async () => {
    renderTable({ shifts: [] });
    await screen.findAllByRole("row");
    expect(screen.getAllByRole("button", { name: /add shift/i })).toHaveLength(4);
  });

  test("adding a shift in a gap posts a one-hour shift with the chosen responder", async () => {
    const user = userEvent.setup();
    const submissions = renderTable();
    const [firstAdd] = await screen.findAllByRole("button", { name: /add shift/i });

    await user.click(firstAdd);
    await user.click(screen.getByRole("button", { name: /add responder/i }));
    await user.selectOptions(screen.getByLabelText("Add responder"), "Blake");
    const [addSave] = screen.getAllByRole("button", { name: "Save" });
    await user.click(addSave);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(submissions).toHaveLength(1));
    expect(submissions[0]).toEqual({
      method: "POST",
      path: "/schedules/1/shifts",
      body: {
        timespan: { start: at(0).toISOString(), finish: at(1).toISOString() },
        shiftAssignments: [{ responderId: 2 }],
      },
    });
  });

  test("editing a shift patches that shift's route with the new assignments", async () => {
    const user = userEvent.setup();
    const submissions = renderTable();
    await user.click(await screen.findByRole("button", { name: /edit shift/i }));

    const form = screen.getByRole("group", { name: "Responders" });
    const [first] = within(form).getAllByRole("combobox");
    await user.selectOptions(first, "Blake");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(submissions).toHaveLength(1));
    expect(submissions[0]).toEqual({
      method: "PATCH",
      path: "/schedules/1/shifts/7",
      body: {
        timespan: { start: at(1).toISOString(), finish: at(3).toISOString() },
        shiftAssignments: [{ responderId: 2 }, { responderId: 2 }],
      },
    });
  });

  test("cancelling an edit puts the row back", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(await screen.findByRole("button", { name: /edit shift/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("button", { name: /edit shift/i })).toBeInTheDocument();
  });

  // KNOWN BUG: ShiftScheduleRow checks `fetcher.data` right after `await fetcher.submit(...)`, but that's the value from
  // the render the click handler closed over, so it's always the pre-submit (empty) data. An error returned by the route
  // (an overlapping shift, say) is never shown, and the form closes as if the save had worked. When that's fixed, this
  // test will start passing and `test.fails` will complain: switch it back to `test`.
  test.fails("an error the route returns is shown on the form", async () => {
    const user = userEvent.setup();
    renderTable({ actionResult: new Error("Shifts can't overlap") });
    await user.click(await screen.findByRole("button", { name: /edit shift/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Shifts can't overlap")).toBeInTheDocument();
  });
});
