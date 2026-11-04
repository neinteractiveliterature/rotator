import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, test, vi } from "vitest";
import { EditableWorkflowStep } from "~/components/workflow-step";
import i18n from "~/i18n";

type Data = { count: number };

function renderStep(save: (data: Data) => Promise<unknown> = async () => {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <EditableWorkflowStep<Data, { count: string }>
        iconName="telephone-fill"
        title="Rings"
        data={{ count: 3 }}
        save={save}
        prepareEditingData={(data) => ({ count: data.count.toString() })}
        finishEditingData={(editing) => ({ count: Number.parseInt(editing.count) })}
      >
        {({ data, editingData, setEditingData }) =>
          editingData ? (
            <input
              aria-label="count"
              value={editingData.count}
              onChange={(event) =>
                // the functional form is the one forms use to keep the rest of the editing data
                setEditingData((prev) => ({ ...prev, count: event.target.value }))
              }
            />
          ) : (
            <p>Rings {data.count} times</p>
          )
        }
      </EditableWorkflowStep>
    </I18nextProvider>,
  );
}

describe("EditableWorkflowStep", () => {
  test("shows the data with an Edit button until editing starts", () => {
    renderStep();
    expect(screen.getByText("Rings")).toBeInTheDocument();
    expect(screen.getByText("Rings 3 times")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  test("editing starts from the prepared data, and Cancel throws the changes away", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByLabelText("count");
    expect(input).toHaveValue("3");
    await user.clear(input);
    await user.type(input, "9");
    expect(input).toHaveValue("9");

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Rings 3 times")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText("count")).toHaveValue("3");
  });

  test("Save passes the finished data to save, then goes back to showing it", async () => {
    const user = userEvent.setup();
    const save = vi.fn<(data: Data) => Promise<unknown>>(async () => {});
    renderStep(save);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByLabelText("count");
    await user.clear(input);
    await user.type(input, "7");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(save).toHaveBeenCalledWith({ count: 7 });
    expect(await screen.findByRole("button", { name: /edit/i })).toBeInTheDocument();
  });
});
