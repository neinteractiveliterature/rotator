import type React from "react";
import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "~/i18n";
import SchedulePhoneNumbers from "~/routes/schedules/phone-numbers";

const phoneNumber1 = {
  id: 1,
  phoneNumber: "+12025550100",
  noActiveShiftMessage: null,
  noActiveShiftTextMessage: null,
};

const phoneNumber2 = {
  id: 2,
  phoneNumber: "+12025550101",
  noActiveShiftMessage: null,
  noActiveShiftTextMessage: null,
};

type LoaderData = Parameters<typeof SchedulePhoneNumbers>[0]["loaderData"];

function renderPage(loaderData: LoaderData) {
  const Stub = createRoutesStub([
    {
      path: "/schedules/:scheduleId/phone-numbers",
      Component: SchedulePhoneNumbers as React.ComponentType<any>,
      loader() {
        return loaderData;
      },
    },
  ]);

  return render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={["/schedules/1/phone-numbers"]} />
    </I18nextProvider>
  );
}

describe("SchedulePhoneNumbers", () => {
  test("shows empty state when no phone numbers are associated", async () => {
    renderPage({ allPhoneNumbers: [phoneNumber1], schedulePhoneNumbers: [] });

    expect(
      await screen.findByText("No phone numbers associated")
    ).toBeInTheDocument();
  });

  test("shows associated phone numbers with Remove buttons", async () => {
    renderPage({
      allPhoneNumbers: [phoneNumber1, phoneNumber2],
      schedulePhoneNumbers: [
        { phoneNumberId: 1, scheduleId: 1, phoneNumber: phoneNumber1 },
      ],
    });

    expect(await screen.findByText("(202) 555-0100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("shows associate form populated with unassociated phone numbers", async () => {
    renderPage({
      allPhoneNumbers: [phoneNumber1, phoneNumber2],
      schedulePhoneNumbers: [
        { phoneNumberId: 1, scheduleId: 1, phoneNumber: phoneNumber1 },
      ],
    });

    await screen.findByText("(202) 555-0100");

    expect(screen.getByRole("option", { name: "(202) 555-0101" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Associate" })).toBeInTheDocument();
  });

  test("hides associate form when all phone numbers are already associated", async () => {
    renderPage({
      allPhoneNumbers: [phoneNumber1],
      schedulePhoneNumbers: [
        { phoneNumberId: 1, scheduleId: 1, phoneNumber: phoneNumber1 },
      ],
    });

    await screen.findByText("(202) 555-0100");

    expect(
      screen.queryByRole("button", { name: "Associate" })
    ).not.toBeInTheDocument();
  });

  test("shows associate form when there are no associated phone numbers yet", async () => {
    renderPage({
      allPhoneNumbers: [phoneNumber1, phoneNumber2],
      schedulePhoneNumbers: [],
    });

    await screen.findByText("No phone numbers associated");

    expect(screen.getByRole("button", { name: "Associate" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "(202) 555-0100" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "(202) 555-0101" })).toBeInTheDocument();
  });
});
