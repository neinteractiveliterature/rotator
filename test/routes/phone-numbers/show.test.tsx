import type React from "react";
import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "~/i18n";
import PhoneNumberPage from "~/routes/phone-numbers/show";

const schedule1 = {
  id: 1,
  name: "On-call schedule A",
  timespan: {
    start: new Date("2025-01-01"),
    finish: new Date("2025-12-31"),
    includeStart: true,
    includeFinish: false,
  },
  welcomeMessage: "",
  voicemailMessage: "",
  callTimeout: 30,
  voicemailSilenceTimeout: 5,
  postCallTextTemplate: "",
  voicemailTextTemplate: "",
  emailFrom: "",
  voicemailEmailSubjectTemplate: "",
  voicemailEmailBodyTemplate: "",
  noActiveShiftTextMessage: "",
  textEmailSubjectTemplate: "",
  textEmailBodyTemplate: "",
  textResponderTemplate: "",
  timeZone: "America/New_York",
};

const schedule2 = {
  ...schedule1,
  id: 2,
  name: "On-call schedule B",
};

const phoneNumber = {
  id: 1,
  phoneNumber: "+12025550100",
  noActiveShiftMessage: null,
  noActiveShiftTextMessage: null,
};

type LoaderData = Parameters<typeof PhoneNumberPage>[0]["loaderData"];

function renderPage(loaderData: LoaderData) {
  const Stub = createRoutesStub([
    {
      path: "/phone_numbers/:phoneNumberId",
      Component: PhoneNumberPage as React.ComponentType<any>,
      loader() {
        return loaderData;
      },
    },
  ]);

  return render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={["/phone_numbers/1"]} />
    </I18nextProvider>
  );
}

describe("PhoneNumberPage schedules section", () => {
  test("shows empty state when no schedules are associated", async () => {
    renderPage({
      phoneNumber: { ...phoneNumber, phoneNumbersSchedules: [] },
      defaultCountryCode: "US",
      allSchedules: [schedule1],
    });

    expect(
      await screen.findByText("No schedules associated")
    ).toBeInTheDocument();
  });

  test("shows associated schedules with Remove buttons", async () => {
    renderPage({
      phoneNumber: {
        ...phoneNumber,
        phoneNumbersSchedules: [
          { phoneNumberId: 1, scheduleId: 1, schedule: schedule1 },
        ],
      },
      defaultCountryCode: "US",
      allSchedules: [schedule1, schedule2],
    });

    expect(await screen.findByText("On-call schedule A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("shows associate form populated with unassociated schedules", async () => {
    renderPage({
      phoneNumber: {
        ...phoneNumber,
        phoneNumbersSchedules: [
          { phoneNumberId: 1, scheduleId: 1, schedule: schedule1 },
        ],
      },
      defaultCountryCode: "US",
      allSchedules: [schedule1, schedule2],
    });

    await screen.findByText("On-call schedule A");

    expect(
      screen.getByRole("option", { name: "On-call schedule B" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Associate" })
    ).toBeInTheDocument();
  });

  test("hides associate form when all schedules are already associated", async () => {
    renderPage({
      phoneNumber: {
        ...phoneNumber,
        phoneNumbersSchedules: [
          { phoneNumberId: 1, scheduleId: 1, schedule: schedule1 },
        ],
      },
      defaultCountryCode: "US",
      allSchedules: [schedule1],
    });

    await screen.findByText("On-call schedule A");

    expect(
      screen.queryByRole("button", { name: "Associate" })
    ).not.toBeInTheDocument();
  });

  test("shows associate form when there are no associated schedules yet", async () => {
    renderPage({
      phoneNumber: { ...phoneNumber, phoneNumbersSchedules: [] },
      defaultCountryCode: "US",
      allSchedules: [schedule1, schedule2],
    });

    await screen.findByText("No schedules associated");

    expect(
      screen.getByRole("button", { name: "Associate" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "On-call schedule A" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "On-call schedule B" })
    ).toBeInTheDocument();
  });
});
