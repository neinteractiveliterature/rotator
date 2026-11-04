import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, test } from "vitest";
import PhoneNumberFormFields from "~/components/forms/phone-number";
import ResponderFormFields, { parseResponderFormData } from "~/components/forms/responder";
import ScheduleFormFields, { parseScheduleFormData } from "~/components/forms/schedule";
import i18n from "~/i18n";

// The form fields are rendered inside a <form>, then the form's data is read back the way a submit would send it and
// run through the parser the route actions use, so a change to either side that breaks the round trip shows up here.

function renderForm(children: React.ReactNode) {
  const result = render(
    <I18nextProvider i18n={i18n}>
      <form data-testid="form">{children}</form>
    </I18nextProvider>,
  );
  const formData = () => new FormData(result.getByTestId("form") as HTMLFormElement);
  return { ...result, formData };
}

describe("ResponderFormFields", () => {
  test("shows the responder's details and submits them back", () => {
    const { formData } = renderForm(
      <ResponderFormFields responder={{ name: "Pat", phoneNumber: "+12025550100", email: "pat@example.com" }} />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Pat");
    expect(parseResponderFormData(formData())).toEqual({
      name: "Pat",
      phoneNumber: "+12025550100",
      email: "pat@example.com",
    });
  });

  test("submits what's typed", async () => {
    const user = userEvent.setup();
    const { formData } = renderForm(<ResponderFormFields responder={{ name: "", phoneNumber: "", email: "" }} />);
    await user.type(screen.getByLabelText("Name"), "Sam");
    await user.type(screen.getByLabelText("Email"), "sam@example.com");
    expect(parseResponderFormData(formData())).toMatchObject({ name: "Sam", email: "sam@example.com" });
  });
});

describe("PhoneNumberFormFields", () => {
  test("shows the number formatted for the default country, and the no-active-shift message", () => {
    renderForm(
      <PhoneNumberFormFields phoneNumber={{ phoneNumber: "+12025550100", noActiveShiftMessage: "Closed" }} />,
    );
    expect(screen.getByLabelText("Phone number")).toHaveValue("(202) 555-0100");
    expect(screen.getByLabelText("No active shift message")).toHaveValue("Closed");
  });

  test("shows a number from another country in international form", () => {
    renderForm(<PhoneNumberFormFields phoneNumber={{ phoneNumber: "+442071838750", noActiveShiftMessage: null }} />);
    expect(screen.getByLabelText("Phone number")).toHaveValue("+44 20 7183 8750");
    expect(screen.getByLabelText("No active shift message")).toHaveValue("");
  });
});

describe("ScheduleFormFields", () => {
  const timespan = {
    start: new Date("2026-03-01T05:00:00Z"),
    finish: new Date("2026-04-01T04:00:00Z"),
    includeStart: true,
    includeFinish: false,
  };

  test("shows the timespan in the schedule's time zone", () => {
    renderForm(
      <ScheduleFormFields
        schedule={{ name: "Weekend", emailFrom: "oncall@example.com", timeZone: "America/New_York", timespan }}
      />,
    );
    // 05:00 UTC on 1 March is midnight in New York (EST)
    expect(screen.getByLabelText("Starts at")).toHaveValue("2026-03-01T00:00");
    expect(screen.getByLabelText("Name")).toHaveValue("Weekend");
    expect(screen.getByLabelText("Email from")).toHaveValue("oncall@example.com");
  });

  test("submitting without changes gives back the same timespan", () => {
    const { formData } = renderForm(
      <ScheduleFormFields
        schedule={{ name: "Weekend", emailFrom: "oncall@example.com", timeZone: "America/New_York", timespan }}
      />,
    );
    const parsed = parseScheduleFormData(formData());
    expect(parsed).toMatchObject({ name: "Weekend", emailFrom: "oncall@example.com", timeZone: "America/New_York" });
    expect(parsed.timespan?.start).toEqual(timespan.start);
    expect(parsed.timespan?.finish).toEqual(timespan.finish);
  });

  test("the time zone can be changed, and the same wall-clock time then means a different instant", async () => {
    const user = userEvent.setup();
    const { formData } = renderForm(
      <ScheduleFormFields
        schedule={{ name: "Weekend", emailFrom: "oncall@example.com", timeZone: "America/New_York", timespan }}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Time zone"), "America/Los_Angeles");
    const parsed = parseScheduleFormData(formData());
    expect(parsed.timeZone).toBe("America/Los_Angeles");
    // midnight Pacific on 1 March (PST) is 08:00 UTC
    expect(parsed.timespan?.start).toEqual(new Date("2026-03-01T08:00:00Z"));
  });
});
