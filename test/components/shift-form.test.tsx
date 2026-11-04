import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, test, vi } from "vitest";
import { ShiftForm, type ShiftForSchedule } from "~/components/shift-scheduling";
import i18n from "~/i18n";

const responders = [
  { id: 1, name: "Alex", phoneNumber: "+12025550101", email: "alex@example.com" },
  { id: 2, name: "Blake", phoneNumber: "+12025550102", email: "blake@example.com" },
  { id: 3, name: "Casey", phoneNumber: "+12025550103", email: "casey@example.com" },
];

const initialShift: Omit<ShiftForSchedule, "id"> = {
  // midnight to 8am in New York (EST), 1-2 March 2026
  timespan: {
    start: new Date("2026-03-01T05:00:00Z"),
    finish: new Date("2026-03-01T13:00:00Z"),
    includeStart: true,
    includeFinish: false,
  },
  shiftAssignments: [
    // deliberately out of order: position decides the order, not the array
    { id: 11, position: 2, responderId: 2, responder: { id: 2, name: "Blake" } },
    { id: 10, position: 1, responderId: 1, responder: { id: 1, name: "Alex" } },
  ],
};

function renderForm({
  save = async () => {},
  cancel = () => {},
}: {
  save?: (shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>;
  cancel?: () => void;
} = {}) {
  render(
    <I18nextProvider i18n={i18n}>
      <ShiftForm
        initialShift={initialShift}
        save={save}
        cancel={cancel}
        responders={responders}
        timeZone="America/New_York"
      />
    </I18nextProvider>,
  );
}

const assignedResponderNames = () =>
  screen
    .getAllByRole("combobox")
    .filter((select) => (select as HTMLSelectElement).value !== "")
    .map((select) => within(select).getByRole("option", { selected: true }).textContent);

describe("ShiftForm", () => {
  test("lists the assigned responders by position, and the times in the schedule's zone", () => {
    renderForm();
    expect(assignedResponderNames()).toEqual(["Alex", "Blake"]);
    expect(screen.getByLabelText("Starts at")).toHaveValue("2026-03-01T00:00");
    expect(screen.getByLabelText("Ends at")).toHaveValue("2026-03-01T08:00");
  });

  test("saving without changes passes the shift along with the assignments in position order", async () => {
    const user = userEvent.setup();
    const save = vi.fn<(shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>>(async () => {});
    renderForm({ save });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(save).toHaveBeenCalledTimes(1);
    const saved = save.mock.calls[0][0];
    expect(saved.timespan.start).toEqual(initialShift.timespan.start);
    expect(saved.timespan.finish).toEqual(initialShift.timespan.finish);
    expect(saved.shiftAssignments.map((sa) => sa.responderId)).toEqual([1, 2]);
  });

  test("changing a responder swaps who's in that slot", async () => {
    const user = userEvent.setup();
    const save = vi.fn<(shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>>(async () => {});
    renderForm({ save });

    const [first] = screen.getAllByRole("combobox");
    await user.selectOptions(first, "Casey");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(save.mock.calls[0][0].shiftAssignments.map((sa) => [sa.responderId, sa.responder.name])).toEqual([
      [3, "Casey"],
      [2, "Blake"],
    ]);
  });

  test("adding a responder puts them last", async () => {
    const user = userEvent.setup();
    const save = vi.fn<(shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>>(async () => {});
    renderForm({ save });

    await user.click(screen.getByRole("button", { name: /add responder/i }));
    await user.selectOptions(screen.getByLabelText("Add responder"), "Casey");
    // the add row has its own Save, ahead of the form's
    const [addSave] = screen.getAllByRole("button", { name: "Save" });
    await user.click(addSave);
    expect(assignedResponderNames()).toEqual(["Alex", "Blake", "Casey"]);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(save.mock.calls[0][0].shiftAssignments.map((sa) => sa.responderId)).toEqual([1, 2, 3]);
  });

  test("cancelling the add row adds nobody", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /add responder/i }));
    const [addCancel] = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(addCancel);

    expect(assignedResponderNames()).toEqual(["Alex", "Blake"]);
    expect(screen.getByRole("button", { name: /add responder/i })).toBeInTheDocument();
  });

  test("changing the start time saves it as that wall-clock time in the schedule's zone", async () => {
    const user = userEvent.setup();
    const save = vi.fn<(shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>>(async () => {});
    renderForm({ save });

    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "2026-03-01T02:00" } });
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 02:00 EST is 07:00 UTC
    expect(save.mock.calls[0][0].timespan.start).toEqual(new Date("2026-03-01T07:00:00Z"));
    expect(save.mock.calls[0][0].timespan.finish).toEqual(initialShift.timespan.finish);
  });

  test("shows the error if saving fails, and the form stays", async () => {
    const user = userEvent.setup();
    renderForm({
      save: async () => {
        throw new Error("Overlaps another shift");
      },
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Overlaps another shift")).toBeInTheDocument();
    expect(screen.getByLabelText("Starts at")).toBeInTheDocument();
  });

  test("cancel calls cancel", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn();
    renderForm({ cancel });

    // only the form's own Cancel is there while the add row is closed
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
