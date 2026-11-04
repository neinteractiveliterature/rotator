import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { Outlet, createRoutesStub } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { parseScheduleFormData } from "~/components/forms/schedule";
import i18n from "~/i18n";
import PhoneFlow from "~/routes/schedules/phone-flow";
import TextFlow from "~/routes/schedules/text-flow";

// The template editor (CodeMirror) can't be typed into under jsdom; see test/components/schedule-steps.test.tsx
vi.mock("~/LiquidInput", () => ({
  LiquidInputControlIfHydrated: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const schedule = {
  id: 5,
  name: "Weekend",
  timespan: { start: new Date(0), finish: new Date(1000), includeStart: true, includeFinish: false },
  welcomeMessage: "Welcome",
  voicemailMessage: "Leave a message",
  callTimeout: 20,
  voicemailSilenceTimeout: 5,
  postCallTextTemplate: "Call ended",
  voicemailTextTemplate: "Voicemail text",
  emailFrom: "oncall@example.com",
  voicemailEmailSubjectTemplate: "Voicemail subject",
  voicemailEmailBodyTemplate: "Voicemail body",
  noActiveShiftTextMessage: "Nobody on",
  textEmailSubjectTemplate: "Text subject",
  textEmailBodyTemplate: "Text body",
  textResponderTemplate: "Text responder",
  timeZone: "UTC",
};

/** Renders a flow page the way the app nests it, and collects the PATCHes the steps send to the schedule route */
function renderFlow(Page: React.ComponentType) {
  const patches: FormData[] = [];
  const Stub = createRoutesStub([
    {
      id: "routes/schedules/$scheduleId",
      path: "/schedules/:scheduleId",
      loader: () => ({ schedule }),
      action: async ({ request }) => {
        if (request.method === "PATCH") patches.push(await request.formData());
        return null;
      },
      Component: Outlet,
      children: [{ path: "flow", Component: Page }],
    },
  ]);
  render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={["/schedules/5/flow"]} />
    </I18nextProvider>,
  );
  return patches;
}

/** The card for the step with this title */
function step(title: string) {
  const card = screen.getByText(title).closest(".card");
  if (!(card instanceof HTMLElement)) throw new Error(`No step titled ${title}`);
  return card;
}

describe("phone flow page", () => {
  test("lays out the call's path, with the schedule's current settings in each step", async () => {
    renderFlow(PhoneFlow);

    expect(await screen.findByRole("heading", { name: "Phone call flow" })).toBeInTheDocument();
    for (const title of [
      "Voice call comes in",
      "If there is an active shift",
      "Read welcome message",
      "Call primary responder",
      "If call answered, connect call",
      "If call not answered, check for more responders",
      "If there are no more responders, record voicemail",
      "If there is no active shift",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Leave a message")).toBeInTheDocument();
    expect(screen.getAllByText("20 seconds").length).toBeGreaterThan(0);
  });

  test("saving a step PATCHes the schedule with just that step's fields, in a form the schedule route can read", async () => {
    const user = userEvent.setup();
    const patches = renderFlow(PhoneFlow);
    await screen.findByRole("heading", { name: "Phone call flow" });

    await user.click(within(step("Call primary responder")).getByRole("button", { name: /edit/i }));
    const input = within(step("Call primary responder")).getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "45");
    await user.click(within(step("Call primary responder")).getByRole("button", { name: /save/i }));

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    // the same parser the schedule route's action uses
    const parsed = Object.fromEntries(
      Object.entries(parseScheduleFormData(patches[0])).filter(([, value]) => value !== undefined),
    );
    expect(parsed).toEqual({ callTimeout: 45 });
  });

  test("a text step saves its template under the right name", async () => {
    const user = userEvent.setup();
    const patches = renderFlow(PhoneFlow);
    await screen.findByRole("heading", { name: "Phone call flow" });

    const welcome = step("Read welcome message");
    await user.click(within(welcome).getByRole("button", { name: /edit/i }));
    await user.type(within(welcome).getByRole("textbox"), "!");
    await user.click(within(welcome).getByRole("button", { name: /save/i }));

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(parseScheduleFormData(patches[0]).welcomeMessage).toBe("Welcome!");
  });
});

describe("text flow page", () => {
  test("lays out the text's path, with the schedule's current settings in each step", async () => {
    renderFlow(TextFlow);

    expect(await screen.findByRole("heading", { name: "Text message flow" })).toBeInTheDocument();
    for (const title of [
      "Inbound text message",
      "If there is an active shift",
      "Outbound text to primary responder",
      "Outbound email to all responders",
      "If there is no active shift",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Text responder")).toBeInTheDocument();
    expect(screen.getByText("Nobody on")).toBeInTheDocument();
  });

  test("saving the no-active-shift step PATCHes that field", async () => {
    const user = userEvent.setup();
    const patches = renderFlow(TextFlow);
    await screen.findByRole("heading", { name: "Text message flow" });

    const card = step("If there is no active shift");
    await user.click(within(card).getByRole("button", { name: /edit/i }));
    await user.type(within(card).getByRole("textbox"), "?");
    await user.click(within(card).getByRole("button", { name: /save/i }));

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(parseScheduleFormData(patches[0]).noActiveShiftTextMessage).toBe("Nobody on?");
  });
});
