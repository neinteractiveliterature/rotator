// @vitest-environment node
import { eq } from "drizzle-orm";
import { RouterContextProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { dbContext } from "~/contexts";
import {
  phoneNumbersSchedulesTable,
  respondersTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import {
  addPhoneNumberToSchedule,
  removePhoneNumberFromSchedule,
  updatePhoneNumber,
} from "~/.server/repositories/phoneNumbers.server";
import {
  createResponder,
  updateResponder,
  upcomingShiftAssignmentsForResponder,
} from "~/.server/repositories/responders.server";
import {
  createSchedule,
  createShift,
  deleteShift,
  duplicateSchedule,
  updateSchedule,
  updateShift,
} from "~/.server/repositories/schedules.server";
import {
  db,
  resetDb,
  rollbackDb,
  setupDb,
  stubDbTransactions,
  teardownDb,
} from "../../support/db";
import {
  createPhoneNumber,
  createResponder as makeResponder,
  createSchedule as makeSchedule,
  createShift as makeShift,
} from "../../support/factories";

beforeAll(async () => {
  await setupDb();
  stubDbTransactions();
});
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

function buildContext() {
  const context = new RouterContextProvider();
  context.set(dbContext, db);
  return context;
}

const hour = 60 * 60 * 1000;
const timespan = (startHoursFromNow: number, lengthHours = 1) => {
  const start = new Date(Date.now() + startHoursFromNow * hour);
  return { start, finish: new Date(start.getTime() + lengthHours * hour) };
};

describe("responders", () => {
  test("createResponder and updateResponder", async () => {
    const context = buildContext();
    const responder = await createResponder(context, {
      name: "Pat",
      phoneNumber: "+12025550100",
      email: "pat@example.com",
    });
    expect(responder.id).toBeGreaterThan(0);

    await updateResponder(context, responder.id, { name: "Patricia" });
    const [reloaded] = await db
      .select()
      .from(respondersTable)
      .where(eq(respondersTable.id, responder.id));
    expect(reloaded).toMatchObject({
      name: "Patricia",
      email: "pat@example.com",
    });
  });

  test("upcomingShiftAssignmentsForResponder only includes shifts that haven't ended", async () => {
    const schedule = await makeSchedule();
    const responder = await makeResponder();
    const other = await makeResponder();
    const mk = (hoursFromNow: number, ids: number[]) =>
      makeShift(schedule.id, ids, {
        timespan: {
          ...timespan(hoursFromNow),
          includeStart: true,
          includeFinish: false,
        },
      });
    await mk(-5, [responder.id]);
    const later = await mk(5, [responder.id]);
    const sooner = await mk(2, [responder.id]);
    await mk(3, [other.id]);

    const results = await upcomingShiftAssignmentsForResponder(
      db,
      responder.id,
    );
    expect(results.map((r) => r.shifts.id)).toEqual([sooner.id, later.id]);
  });
});

describe("phone numbers", () => {
  test("updatePhoneNumber", async () => {
    const phoneNumber = await createPhoneNumber();
    await updatePhoneNumber(buildContext(), phoneNumber.id, {
      noActiveShiftMessage: "Closed",
    });
    const reloaded = await db.query.phoneNumbersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, phoneNumber.id),
    });
    expect(reloaded?.noActiveShiftMessage).toBe("Closed");
  });

  test("adding a phone number to a schedule is idempotent, and it can be removed again", async () => {
    const context = buildContext();
    const phoneNumber = await createPhoneNumber();
    const schedule = await makeSchedule();
    const other = await makeSchedule();

    await addPhoneNumberToSchedule(context, phoneNumber.id, schedule.id);
    await addPhoneNumberToSchedule(context, phoneNumber.id, schedule.id);
    await addPhoneNumberToSchedule(context, phoneNumber.id, other.id);
    expect(await db.select().from(phoneNumbersSchedulesTable)).toHaveLength(2);

    await removePhoneNumberFromSchedule(context, phoneNumber.id, schedule.id);
    const remaining = await db.select().from(phoneNumbersSchedulesTable);
    expect(remaining).toEqual([
      { phoneNumberId: phoneNumber.id, scheduleId: other.id },
    ]);
  });
});

describe("schedules", () => {
  test("createSchedule, updateSchedule", async () => {
    const context = buildContext();
    const { id: _id, ...values } = await makeSchedule();
    const schedule = await createSchedule(context, { ...values, name: "New" });
    expect(schedule.name).toBe("New");

    await updateSchedule(context, schedule.id, { name: "Renamed" });
    const reloaded = await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, schedule.id),
    });
    expect(reloaded?.name).toBe("Renamed");
  });

  test("duplicateSchedule copies the schedule, applying overrides, without its shifts", async () => {
    const original = await makeSchedule({ welcomeMessage: "Hi there" });
    const responder = await makeResponder();
    await makeShift(original.id, [responder.id]);

    const copy = await duplicateSchedule(buildContext(), original.id, {
      name: "Copy",
    });
    expect(copy.id).not.toBe(original.id);
    expect(copy).toMatchObject({ name: "Copy", welcomeMessage: "Hi there" });
    expect(
      await db
        .select()
        .from(shiftsTable)
        .where(eq(shiftsTable.scheduleId, copy.id)),
    ).toHaveLength(0);
  });

  test("duplicateSchedule of a missing schedule is a 404", async () => {
    await expect(
      duplicateSchedule(buildContext(), 999999, {}),
    ).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("shifts", () => {
  const assignmentsFor = async (shiftId: number) =>
    (
      await db
        .select()
        .from(shiftAssignmentsTable)
        .where(eq(shiftAssignmentsTable.shiftId, shiftId))
        .orderBy(shiftAssignmentsTable.position)
    ).map((a) => [a.responderId, a.position]);

  test("createShift assigns responders in order, from position 1", async () => {
    const schedule = await makeSchedule();
    const [a, b] = [await makeResponder(), await makeResponder()];
    const shift = await createShift(buildContext(), schedule.id, {
      timespan: timespan(1),
      responderIds: [b.id, a.id],
    });
    expect(shift.scheduleId).toBe(schedule.id);
    expect(await assignmentsFor(shift.id)).toEqual([
      [b.id, 1],
      [a.id, 2],
    ]);
  });

  test("createShift with nobody assigned just makes the shift", async () => {
    const schedule = await makeSchedule();
    const shift = await createShift(buildContext(), schedule.id, {
      timespan: timespan(1),
      responderIds: [],
    });
    expect(await assignmentsFor(shift.id)).toEqual([]);
  });

  test("createShift rolls back the shift if assigning fails", async () => {
    const schedule = await makeSchedule();
    await expect(
      createShift(buildContext(), schedule.id, {
        timespan: timespan(1),
        responderIds: [999999],
      }),
    ).rejects.toThrow();
    expect(await db.select().from(shiftsTable)).toHaveLength(0);
  });

  test("updateShift replaces the timespan and the assignments", async () => {
    const context = buildContext();
    const schedule = await makeSchedule();
    const [a, b] = [await makeResponder(), await makeResponder()];
    const shift = await makeShift(schedule.id, [a.id]);

    const newTimespan = timespan(10, 2);
    await updateShift(context, shift.id, {
      timespan: newTimespan,
      responderIds: [b.id, a.id],
    });

    expect(await assignmentsFor(shift.id)).toEqual([
      [b.id, 1],
      [a.id, 2],
    ]);
    const [reloaded] = await db
      .select()
      .from(shiftsTable)
      .where(eq(shiftsTable.id, shift.id));
    expect(reloaded.timespan.start).toEqual(newTimespan.start);
    expect(reloaded.timespan.finish).toEqual(newTimespan.finish);
  });

  test("deleteShift removes the shift and its assignments", async () => {
    const schedule = await makeSchedule();
    const responder = await makeResponder();
    const shift = await makeShift(schedule.id, [responder.id]);

    await deleteShift(buildContext(), shift.id);
    expect(await db.select().from(shiftsTable)).toHaveLength(0);
    expect(await db.select().from(shiftAssignmentsTable)).toHaveLength(0);
  });
});
