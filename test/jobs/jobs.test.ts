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
import { notifyTextReceivedJob } from "~/.server/jobs/notifyTextReceived";
import { notifyVoicemailReceivedJob } from "~/.server/jobs/notifyVoicemailReceived";
import { sendPostCallTextJob } from "~/.server/jobs/sendPostCallText";
import { resetDb, rollbackDb, setupDb, teardownDb } from "../support/db";
import {
  createResponder,
  createSchedule,
  createShift,
  createStaffedSchedule,
} from "../support/factories";
import { buildJobContext } from "../support/webhooks";

beforeAll(setupDb);
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

const receivedAt = () => new Date().toISOString();

describe("notifyTextReceived", () => {
  test("emails every responder on the active shift", async () => {
    const { schedule, responders } = await createStaffedSchedule(2);
    const { ctx, sendMail, createMessage } = buildJobContext();

    await notifyTextReceivedJob.handler(
      {
        scheduleId: schedule.id,
        from: "+12025550123",
        body: "help me",
        receivedAt: receivedAt(),
      },
      ctx,
    );

    expect(sendMail.mock.calls.map(([m]) => m.to)).toEqual(
      responders.map((r) => r.email),
    );
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      from: "rotator@example.com",
      // formatted as the schedule's default country would show it
      subject: "Text from (202) 555-0123",
      text: "help me",
    });
    expect(createMessage).not.toHaveBeenCalled();
  });

  test("uses the shift that was active when the text arrived, not when the job runs", async () => {
    const hour = 60 * 60 * 1000;
    const schedule = await createSchedule();
    const responder = await createResponder();
    // a shift that ended an hour ago
    await createShift(schedule.id, [responder.id], {
      timespan: {
        start: new Date(Date.now() - 3 * hour),
        finish: new Date(Date.now() - hour),
        includeStart: true,
        includeFinish: false,
      },
    });
    const { ctx, sendMail } = buildJobContext();
    const payload = {
      scheduleId: schedule.id,
      from: "+12025550123",
      body: "x",
    };

    await notifyTextReceivedJob.handler(
      { ...payload, receivedAt: receivedAt() },
      ctx,
    );
    expect(sendMail).not.toHaveBeenCalled();

    const duringShift = new Date(Date.now() - 2 * hour).toISOString();
    await notifyTextReceivedJob.handler(
      { ...payload, receivedAt: duringShift },
      ctx,
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe(responder.email);
  });

  test("does nothing for a schedule that's gone, or with nobody on shift", async () => {
    const schedule = await createSchedule();
    const { ctx, sendMail } = buildJobContext();
    await notifyTextReceivedJob.handler(
      {
        scheduleId: schedule.id,
        from: "+12025550123",
        body: "x",
        receivedAt: receivedAt(),
      },
      ctx,
    );
    await notifyTextReceivedJob.handler(
      {
        scheduleId: 999999,
        from: "+12025550123",
        body: "x",
        receivedAt: receivedAt(),
      },
      ctx,
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  test("fails (so the queue retries it) when a send fails", async () => {
    const { schedule } = await createStaffedSchedule(1);
    const { ctx, sendMail } = buildJobContext();
    sendMail.mockRejectedValueOnce(new Error("SMTP down"));
    await expect(
      notifyTextReceivedJob.handler(
        {
          scheduleId: schedule.id,
          from: "+12025550123",
          body: "x",
          receivedAt: receivedAt(),
        },
        ctx,
      ),
    ).rejects.toThrow("SMTP down");
  });
});

describe("notifyVoicemailReceived", () => {
  test("emails every responder and texts the first one", async () => {
    const { phoneNumber, schedule, responders } =
      await createStaffedSchedule(2);
    const { ctx, sendMail, createMessage } = buildJobContext();

    await notifyVoicemailReceivedJob.handler(
      {
        scheduleId: schedule.id,
        from: "+15555550123",
        to: phoneNumber.phoneNumber,
        recordingUrl: "https://api.twilio.test/rec1",
        receivedAt: receivedAt(),
      },
      ctx,
    );

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

  test("does nothing with nobody on shift", async () => {
    const schedule = await createSchedule();
    const { ctx, sendMail, createMessage } = buildJobContext();
    await notifyVoicemailReceivedJob.handler(
      {
        scheduleId: schedule.id,
        from: "+15555550123",
        to: "+12025550100",
        recordingUrl: "https://x/rec",
        receivedAt: receivedAt(),
      },
      ctx,
    );
    expect(sendMail).not.toHaveBeenCalled();
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe("sendPostCallText", () => {
  test("texts the responder", async () => {
    const { phoneNumber, schedule, responders } =
      await createStaffedSchedule(2);
    const { ctx, createMessage } = buildJobContext();

    await sendPostCallTextJob.handler(
      {
        scheduleId: schedule.id,
        responderId: responders[1].id,
        from: "+15555550123",
        to: phoneNumber.phoneNumber,
      },
      ctx,
    );

    expect(createMessage).toHaveBeenCalledWith({
      from: phoneNumber.phoneNumber,
      to: responders[1].phoneNumber,
      body: "Call from +15555550123 ended",
    });
  });

  test("does nothing if the responder is gone", async () => {
    const { phoneNumber, schedule } = await createStaffedSchedule(1);
    const { ctx, createMessage } = buildJobContext();
    await sendPostCallTextJob.handler(
      {
        scheduleId: schedule.id,
        responderId: 999999,
        from: "+15555550123",
        to: phoneNumber.phoneNumber,
      },
      ctx,
    );
    expect(createMessage).not.toHaveBeenCalled();
  });
});
