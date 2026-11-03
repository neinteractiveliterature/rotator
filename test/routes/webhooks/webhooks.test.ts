// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { action as incoming } from "~/routes/webhooks/incoming";
import { action as text } from "~/routes/webhooks/text";
import { action as called } from "~/routes/webhooks/called";
import { action as voicemail } from "~/routes/webhooks/voicemail";
import { eq } from "drizzle-orm";
import { shiftsTable } from "~/db/schema";
import { db, resetDb, rollbackDb, setupDb, teardownDb } from "../../support/db";
import {
  createPhoneNumber,
  createStaffedSchedule,
} from "../../support/factories";
import { buildWebhookContext, twilioRequest } from "../../support/webhooks";

// These pin down what the Twilio webhook handlers do today (including their outbound texts and emails), so that moving
// those side effects out of the handlers can be done with a safety net.

beforeAll(setupDb);
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

type TestContext = ReturnType<typeof buildWebhookContext>["context"];

// The handlers are typed with React Router's generated Route.ActionArgs, which has more than these tests supply
function argsFor<Args>() {
  return (
    context: TestContext,
    request: Request,
    params: Record<string, string> = {},
  ) => ({ context, request, params }) as Args;
}

const incomingArgs = argsFor<Parameters<typeof incoming>[0]>();
const textArgs = argsFor<Parameters<typeof text>[0]>();
const voicemailArgs = argsFor<Parameters<typeof voicemail>[0]>();
const calledArgs = argsFor<Parameters<typeof called>[0]>();

async function xml(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/xml");
  return await response.text();
}

describe("incoming call", () => {
  test("dials the first responder on the active shift", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule();
    const { context, sendMail, createMessage } = buildWebhookContext();

    const body = await xml(
      await incoming(
        incomingArgs(
          context,
          twilioRequest("incoming", {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "ringing",
          }),
        ),
      ),
    );

    expect(body).toContain("<Say");
    expect(body).toContain("Welcome");
    expect(body).toContain(responders[0].phoneNumber);
    expect(body).toContain(`/webhooks/called/${responders[0].id}`);
    expect(sendMail).not.toHaveBeenCalled();
    expect(createMessage).not.toHaveBeenCalled();
  });

  test("tells callers of an unknown number so", async () => {
    const { context } = buildWebhookContext();
    const body = await xml(
      await incoming(
        incomingArgs(
          context,
          twilioRequest("incoming", {
            From: "+15555550123",
            To: "+12025559999",
            CallStatus: "ringing",
          }),
        ),
      ),
    );
    expect(body).toContain("<Say");
    expect(body).not.toContain("<Dial");
  });

  test("uses the phone number's no-active-shift message when no schedule is active", async () => {
    const phoneNumber = await createPhoneNumber({
      noActiveShiftMessage: "Nobody home",
    });
    const { context } = buildWebhookContext();
    const body = await xml(
      await incoming(
        incomingArgs(
          context,
          twilioRequest("incoming", {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "ringing",
          }),
        ),
      ),
    );
    expect(body).toContain("Nobody home");
  });
});

describe("incoming text", () => {
  test("emails every responder and relays the text to the first one in the TwiML response", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule(2);
    const { context, sendMail, createMessage } = buildWebhookContext();

    const body = await xml(
      await text(
        textArgs(
          context,
          twilioRequest("text", {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            Body: "help me",
          }),
        ),
      ),
    );

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map(([m]) => m.to)).toEqual(
      responders.map((r) => r.email),
    );
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: "rotator@example.com",
      subject: expect.stringContaining("Text from"),
      text: "help me",
    });
    expect(body).toContain("help me");
    expect(body).toContain(responders[0].phoneNumber);
    expect(createMessage).not.toHaveBeenCalled();
  });

  test("sends the schedule's no-active-shift message when nobody is on shift", async () => {
    const { phoneNumber, shift } = await createStaffedSchedule(1);
    // end the shift in the past
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await db
      .update(shiftsTable)
      .set({
        timespan: {
          start: past,
          finish: new Date(past.getTime() + 1000),
          includeStart: true,
          includeFinish: false,
        },
      })
      .where(eq(shiftsTable.id, shift.id));

    const { context, sendMail } = buildWebhookContext();
    const body = await xml(
      await text(
        textArgs(
          context,
          twilioRequest("text", {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            Body: "anyone?",
          }),
        ),
      ),
    );
    expect(body).toContain("Nobody is on call");
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("voicemail", () => {
  test("emails every responder and texts the first one", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule(2);
    const { context, sendMail, createMessage } = buildWebhookContext();

    const body = await xml(
      await voicemail(
        voicemailArgs(
          context,
          twilioRequest("voicemail", {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "completed",
            RecordingUrl: "https://api.twilio.test/rec1",
          }),
        ),
      ),
    );

    expect(body).toContain("<Hangup");
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map(([m]) => m.to)).toEqual(
      responders.map((r) => r.email),
    );
    expect(sendMail.mock.calls[0][0].text).toContain(
      "https://api.twilio.test/rec1.mp3",
    );
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect(createMessage).toHaveBeenCalledWith({
      from: phoneNumber.phoneNumber,
      to: responders[0].phoneNumber,
      body: expect.stringContaining("https://api.twilio.test/rec1.mp3"),
    });
  });
});

describe("call finished", () => {
  test("texts the responder who answered after a completed call", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule(2);
    const { context, sendMail, createMessage } = buildWebhookContext();

    const body = await xml(
      await called(
        calledArgs(
          context,
          twilioRequest("called/" + responders[0].id, {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "completed",
            DialCallStatus: "completed",
          }),
          { responderId: String(responders[0].id) },
        ),
      ),
    );

    expect(body).toContain("<Hangup");
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect(createMessage).toHaveBeenCalledWith({
      from: phoneNumber.phoneNumber,
      to: responders[0].phoneNumber,
      body: "Call from +15555550123 ended",
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  test("tries the next responder when the call wasn't answered", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule(2);
    const { context, createMessage } = buildWebhookContext();

    const body = await xml(
      await called(
        calledArgs(
          context,
          twilioRequest("called/" + responders[0].id, {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "completed",
            DialCallStatus: "no-answer",
          }),
          { responderId: String(responders[0].id) },
        ),
      ),
    );

    expect(body).toContain(responders[1].phoneNumber);
    expect(body).toContain(`/webhooks/called/${responders[1].id}`);
    expect(createMessage).not.toHaveBeenCalled();
  });

  test("falls through to voicemail when the last responder doesn't answer", async () => {
    const { phoneNumber, responders } = await createStaffedSchedule(2);
    const { context } = buildWebhookContext();

    const body = await xml(
      await called(
        calledArgs(
          context,
          twilioRequest("called/" + responders[1].id, {
            From: "+15555550123",
            To: phoneNumber.phoneNumber,
            CallStatus: "completed",
            DialCallStatus: "no-answer",
          }),
          { responderId: String(responders[1].id) },
        ),
      ),
    );

    expect(body).toContain("<Record");
    expect(body).toContain("Leave a message");
  });
});
