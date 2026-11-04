// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { action as newResponder } from "~/routes/responders/new";
import { action as editResponder } from "~/routes/responders/edit";
import { action as editPhoneNumber } from "~/routes/phone-numbers/edit";
import { action as phoneNumberSchedules } from "~/routes/phone-numbers/show";
import { action as schedulePhoneNumbers } from "~/routes/schedules/phone-numbers";
import { action as newSchedule } from "~/routes/schedules/new";
import { action as editSchedule } from "~/routes/schedules/edit";
import { action as patchSchedule } from "~/routes/schedules/$scheduleId";
import { action as duplicateSchedule } from "~/routes/schedules/duplicate";
import { action as createShift } from "~/routes/schedules/shifts";
import { action as changeShift } from "~/routes/schedules/$shiftId";
import {
  phoneNumbersSchedulesTable,
  schedulesTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import {
  db,
  resetDb,
  rollbackDb,
  setupDb,
  stubDbTransactions,
  teardownDb,
} from "../support/db";
import {
  createPhoneNumber,
  createResponder,
  createSchedule,
  createShift as makeShift,
} from "../support/factories";
import { argsFor, formRequest, jsonRequest } from "../support/routes";

// Calls the admin routes' actions the way React Router does, with a form or JSON body, and checks what ends up in the
// database and where the user is sent next.

beforeAll(async () => {
  await setupDb();
  stubDbTransactions();
});
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

const newResponderArgs = argsFor<Parameters<typeof newResponder>[0]>();
const editResponderArgs = argsFor<Parameters<typeof editResponder>[0]>();
const editPhoneNumberArgs = argsFor<Parameters<typeof editPhoneNumber>[0]>();
const phoneNumberSchedulesArgs = argsFor<Parameters<typeof phoneNumberSchedules>[0]>();
const schedulePhoneNumbersArgs = argsFor<Parameters<typeof schedulePhoneNumbers>[0]>();
const newScheduleArgs = argsFor<Parameters<typeof newSchedule>[0]>();
const editScheduleArgs = argsFor<Parameters<typeof editSchedule>[0]>();
const patchScheduleArgs = argsFor<Parameters<typeof patchSchedule>[0]>();
const duplicateScheduleArgs = argsFor<Parameters<typeof duplicateSchedule>[0]>();
const createShiftArgs = argsFor<Parameters<typeof createShift>[0]>();
const changeShiftArgs = argsFor<Parameters<typeof changeShift>[0]>();

function expectRedirect(result: unknown, location: string) {
  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(302);
  expect((result as Response).headers.get("Location")).toBe(location);
}

describe("responders", () => {
  test("creating one saves it and goes to its page", async () => {
    const result = await newResponder(
      newResponderArgs(
        formRequest("POST", { name: "Pat", phoneNumber: "+12025550100", email: "pat@example.com" }),
      ),
    );
    const responder = await db.query.respondersTable.findFirst();
    expect(responder).toMatchObject({ name: "Pat", email: "pat@example.com" });
    expectRedirect(result, `/responders/${responder!.id}`);
  });

  test("editing one updates it and goes to its page", async () => {
    const responder = await createResponder({ name: "Old" });
    const result = await editResponder(
      editResponderArgs(
        formRequest("PATCH", { name: "New", phoneNumber: responder.phoneNumber, email: responder.email }),
        { responderId: String(responder.id) },
      ),
    );
    expectRedirect(result, `/responders/${responder.id}`);
    const reloaded = await db.query.respondersTable.findFirst();
    expect(reloaded?.name).toBe("New");
  });
});

describe("phone numbers", () => {
  test("editing one normalizes the number to E.164", async () => {
    const phoneNumber = await createPhoneNumber();
    const result = await editPhoneNumber(
      editPhoneNumberArgs(
        formRequest("PATCH", { phoneNumber: "(202) 555-0199", noActiveShiftMessage: "Closed" }),
        { phoneNumberId: String(phoneNumber.id) },
      ),
    );
    expectRedirect(result, `/phone_numbers/${phoneNumber.id}`);
    const reloaded = await db.query.phoneNumbersTable.findFirst();
    expect(reloaded).toMatchObject({ phoneNumber: "+12025550199", noActiveShiftMessage: "Closed" });
  });

  test("an invalid number is rejected without saving", async () => {
    const phoneNumber = await createPhoneNumber();
    const result = await editPhoneNumber(
      editPhoneNumberArgs(formRequest("PATCH", { phoneNumber: "not a number" }), {
        phoneNumberId: String(phoneNumber.id),
      }),
    );
    expect(result).toBeInstanceOf(Error);
    const reloaded = await db.query.phoneNumbersTable.findFirst();
    expect(reloaded?.phoneNumber).toBe(phoneNumber.phoneNumber);
  });

  test("a phone number can be added to and removed from a schedule, from either side", async () => {
    const phoneNumber = await createPhoneNumber();
    const schedule = await createSchedule();
    const links = () => db.select().from(phoneNumbersSchedulesTable);

    await phoneNumberSchedules(
      phoneNumberSchedulesArgs(formRequest("POST", { scheduleId: String(schedule.id) }), {
        phoneNumberId: String(phoneNumber.id),
      }),
    );
    expect(await links()).toHaveLength(1);

    await phoneNumberSchedules(
      phoneNumberSchedulesArgs(formRequest("DELETE", { scheduleId: String(schedule.id) }), {
        phoneNumberId: String(phoneNumber.id),
      }),
    );
    expect(await links()).toHaveLength(0);

    await schedulePhoneNumbers(
      schedulePhoneNumbersArgs(formRequest("POST", { phoneNumberId: String(phoneNumber.id) }), {
        scheduleId: String(schedule.id),
      }),
    );
    expect(await links()).toHaveLength(1);

    await schedulePhoneNumbers(
      schedulePhoneNumbersArgs(formRequest("DELETE", { phoneNumberId: String(phoneNumber.id) }), {
        scheduleId: String(schedule.id),
      }),
    );
    expect(await links()).toHaveLength(0);
  });
});

describe("schedules", () => {
  const scheduleFields = {
    name: "Weekend",
    emailFrom: "oncall@example.com",
    timeZone: "America/New_York",
    "timespan.start": "2026-01-01T00:00",
    "timespan.finish": "2026-12-31T00:00",
  };

  test("creating one fills in defaults for what the form leaves out", async () => {
    const result = await newSchedule(newScheduleArgs(formRequest("POST", scheduleFields)));
    const schedule = await db.query.schedulesTable.findFirst();
    expect(schedule).toMatchObject({ name: "Weekend", emailFrom: "oncall@example.com", callTimeout: 10 });
    expectRedirect(result, `/schedules/${schedule!.id}`);
  });

  test("editing one changes only the fields the form sent", async () => {
    const schedule = await createSchedule({ welcomeMessage: "Keep me" });
    const result = await editSchedule(
      editScheduleArgs(formRequest("PATCH", { name: "Renamed" }), { scheduleId: String(schedule.id) }),
    );
    expectRedirect(result, `/schedules/${schedule.id}`);
    const reloaded = await db.query.schedulesTable.findFirst();
    expect(reloaded).toMatchObject({ name: "Renamed", welcomeMessage: "Keep me" });
  });

  test("PATCHing the schedule route updates it, and other methods are a 404", async () => {
    const schedule = await createSchedule();
    await patchSchedule(
      patchScheduleArgs(formRequest("PATCH", { name: "Patched" }), { scheduleId: String(schedule.id) }),
    );
    expect((await db.query.schedulesTable.findFirst())?.name).toBe("Patched");

    const result = await patchSchedule(
      patchScheduleArgs(formRequest("DELETE", {}), { scheduleId: String(schedule.id) }),
    );
    expect((result as Response).status).toBe(404);
  });

  test("duplicating copies the schedule with the form's changes", async () => {
    const schedule = await createSchedule({ name: "Original", welcomeMessage: "Hello" });
    const result = await duplicateSchedule(
      duplicateScheduleArgs(formRequest("POST", { name: "Copy" }), { scheduleId: String(schedule.id) }),
    );
    const schedules = await db.select().from(schedulesTable).orderBy(schedulesTable.id);
    expect(schedules.map((s) => s.name)).toEqual(["Original", "Copy"]);
    expect(schedules[1].welcomeMessage).toBe("Hello");
    expectRedirect(result, `/schedules/${schedules[1].id}`);
  });
});

describe("shifts", () => {
  const shiftBody = (responderIds: number[]) => ({
    timespan: { start: "2026-06-01T00:00:00.000Z", finish: "2026-06-02T00:00:00.000Z" },
    shiftAssignments: responderIds.map((responderId) => ({ responderId })),
  });

  test("creating a shift assigns the responders in order", async () => {
    const schedule = await createSchedule();
    const [a, b] = [await createResponder(), await createResponder()];
    await createShift(
      createShiftArgs(jsonRequest("POST", shiftBody([b.id, a.id])), { scheduleId: String(schedule.id) }),
    );
    const shift = await db.query.shiftsTable.findFirst({
      with: { shiftAssignments: true },
    });
    expect(shift?.timespan.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(
      shift?.shiftAssignments.sort((x, y) => x.position - y.position).map((sa) => sa.responderId),
    ).toEqual([b.id, a.id]);
  });

  test("a shift can be rescheduled, then deleted", async () => {
    const schedule = await createSchedule();
    const [a, b] = [await createResponder(), await createResponder()];
    const shift = await makeShift(schedule.id, [a.id]);

    await changeShift(
      changeShiftArgs(jsonRequest("PATCH", shiftBody([b.id])), { shiftId: String(shift.id) }),
    );
    const assignments = await db.select().from(shiftAssignmentsTable).where(eq(shiftAssignmentsTable.shiftId, shift.id));
    expect(assignments.map((sa) => sa.responderId)).toEqual([b.id]);

    await changeShift(changeShiftArgs(jsonRequest("DELETE", {}), { shiftId: String(shift.id) }));
    expect(await db.select().from(shiftsTable)).toHaveLength(0);
    expect(await db.select().from(shiftAssignmentsTable)).toHaveLength(0);
  });

  test("only POST creates and only PATCH/DELETE change", async () => {
    const schedule = await createSchedule();
    const created = await createShift(
      createShiftArgs(jsonRequest("PUT", shiftBody([])), { scheduleId: String(schedule.id) }),
    );
    expect((created as Response).status).toBe(404);
    const changed = await changeShift(changeShiftArgs(jsonRequest("POST", {}), { shiftId: "1" }));
    expect((changed as Response).status).toBe(404);
  });
});

