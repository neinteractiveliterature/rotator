import type React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { Outlet, createRoutesStub } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { CallTimeoutForm } from "~/components/forms/schedules/call-timeout";
import NoActiveShiftText from "~/components/forms/schedules/no-active-shift-text";
import { OutboundEmailForm } from "~/components/forms/schedules/outbound-email";
import { OutboundTextForm } from "~/components/forms/schedules/outbound-text";
import PostCallTextMessage from "~/components/forms/schedules/post-call-text-message";
import { PostVoicemailEmailForm } from "~/components/forms/schedules/post-voicemail-email";
import { PostVoicemailTextForm } from "~/components/forms/schedules/post-voicemail-text";
import { VoicemailForm } from "~/components/forms/schedules/voicemail";
import WelcomeMessage from "~/components/forms/schedules/welcome-message";
import i18n from "~/i18n";

// The code editor behind the template fields is CodeMirror, which isn't practical to type into under jsdom, so it's
// swapped for a plain textarea. What's under test is each step's wiring: the right value shown, the right field
// changed, and the right data saved.
vi.mock("~/LiquidInput", () => ({
  LiquidInputControlIfHydrated: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const schedule = {
  id: 1,
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

type SaveFn = (data: Record<string, unknown>) => Promise<unknown>;

function renderStep(buildStep: (save: SaveFn) => React.ReactNode) {
  const save = vi.fn<SaveFn>(async () => {});
  const Stub = createRoutesStub([
    {
      id: "routes/schedules/$scheduleId",
      path: "/",
      loader: () => ({ schedule }),
      Component: Outlet,
      children: [{ index: true, Component: () => buildStep(save) }],
    },
  ]);
  render(
    <I18nextProvider i18n={i18n}>
      <Stub />
    </I18nextProvider>,
  );
  return save;
}

// Each case: how to render the step, the fields it should save, and (for the template steps) how many text boxes it
// shows while editing. Every text box is appended to, so a step that wires a box to the wrong field saves the wrong data.
const templateCases: {
  name: string;
  build: (save: SaveFn) => React.ReactNode;
  fields: (keyof typeof schedule)[];
}[] = [
  { name: "welcome message", build: (save) => <WelcomeMessage save={save} />, fields: ["welcomeMessage"] },
  { name: "no-active-shift text", build: (save) => <NoActiveShiftText save={save} />, fields: ["noActiveShiftTextMessage"] },
  { name: "post-call text", build: (save) => <PostCallTextMessage save={save} />, fields: ["postCallTextTemplate"] },
  { name: "outbound text", build: (save) => <OutboundTextForm save={save} />, fields: ["textResponderTemplate"] },
  {
    name: "outbound email",
    build: (save) => <OutboundEmailForm save={save} />,
    fields: ["textEmailSubjectTemplate", "textEmailBodyTemplate"],
  },
  { name: "post-voicemail text", build: (save) => <PostVoicemailTextForm save={save} />, fields: ["voicemailTextTemplate"] },
  {
    name: "post-voicemail email",
    build: (save) => <PostVoicemailEmailForm save={save} />,
    fields: ["voicemailEmailSubjectTemplate", "voicemailEmailBodyTemplate"],
  },
];

describe.each(templateCases)("$name step", ({ build, fields }) => {
  test("shows the current values, and saves each edited box under its own field", async () => {
    const user = userEvent.setup();
    const save = renderStep(build);
    for (const field of fields) {
      expect(await screen.findByText(String(schedule[field]))).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(fields.length);
    for (const box of boxes) {
      await user.type(box, "!");
    }
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual(
      Object.fromEntries(fields.map((field) => [field, `${schedule[field]}!`])),
    );
  });
});

describe("call timeout step", () => {
  const build = (save: SaveFn) => <CallTimeoutForm title="Ring" iconName="telephone-fill" save={save} />;

  test("shows the timeout in seconds, and saves an edited one as a number", async () => {
    const user = userEvent.setup();
    const save = renderStep(build);
    expect(await screen.findByText("20 seconds")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(20);
    await user.clear(input);
    await user.type(input, "45");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(save.mock.calls[0][0]).toEqual({ callTimeout: 45 });
  });
});

describe("voicemail step", () => {
  const build = (save: SaveFn) => <VoicemailForm save={save} />;

  test("saves an edited silence timeout as a number, leaving the message alone", async () => {
    const user = userEvent.setup();
    const save = renderStep(build);
    expect(await screen.findByText("Leave a message")).toBeInTheDocument();
    expect(screen.getByText("5 seconds")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "8");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(save.mock.calls[0][0]).toEqual({ voicemailSilenceTimeout: 8, voicemailMessage: "Leave a message" });
  });

  test("saves an edited voicemail message", async () => {
    const user = userEvent.setup();
    const save = renderStep(build);
    await screen.findByText("Leave a message");

    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.type(within(document.body).getByRole("textbox"), "!");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(save.mock.calls[0][0]).toEqual({ voicemailSilenceTimeout: 5, voicemailMessage: "Leave a message!" });
  });
});
