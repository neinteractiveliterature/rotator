// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { loader as respondersList } from "~/routes/responders/list";
import { loader as responderShow } from "~/routes/responders/show";
import { loader as responderEdit } from "~/routes/responders/edit";
import { loader as phoneNumbersList } from "~/routes/phone-numbers/list";
import { loader as phoneNumberShow } from "~/routes/phone-numbers/show";
import { loader as phoneNumberEdit } from "~/routes/phone-numbers/edit";
import { loader as schedulesList } from "~/routes/schedules/list";
import { loader as scheduleShow } from "~/routes/schedules/$scheduleId";
import { loader as scheduleEdit } from "~/routes/schedules/edit";
import { loader as scheduleDuplicate } from "~/routes/schedules/duplicate";
import { loader as scheduleShifts } from "~/routes/schedules/shifts";
import { loader as schedulePhoneNumbers } from "~/routes/schedules/phone-numbers";
import { resetDb, rollbackDb, setupDb, teardownDb } from "../support/db";
import {
  createPhoneNumber,
  createResponder,
  createSchedule,
  createShift,
  linkPhoneNumber,
} from "../support/factories";
import { argsFor } from "../support/routes";

// Calls the admin routes' loaders directly, to check what each page is given and that a missing record is a 404.

beforeAll(setupDb);
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

const request = new Request("http://localhost/");

const respondersListArgs = argsFor<Parameters<typeof respondersList>[0]>();
const responderShowArgs = argsFor<Parameters<typeof responderShow>[0]>();
const responderEditArgs = argsFor<Parameters<typeof responderEdit>[0]>();
const phoneNumbersListArgs = argsFor<Parameters<typeof phoneNumbersList>[0]>();
const phoneNumberShowArgs = argsFor<Parameters<typeof phoneNumberShow>[0]>();
const phoneNumberEditArgs = argsFor<Parameters<typeof phoneNumberEdit>[0]>();
const schedulesListArgs = argsFor<Parameters<typeof schedulesList>[0]>();
const scheduleShowArgs = argsFor<Parameters<typeof scheduleShow>[0]>();
const scheduleEditArgs = argsFor<Parameters<typeof scheduleEdit>[0]>();
const scheduleDuplicateArgs = argsFor<Parameters<typeof scheduleDuplicate>[0]>();
const scheduleShiftsArgs = argsFor<Parameters<typeof scheduleShifts>[0]>();
const schedulePhoneNumbersArgs = argsFor<Parameters<typeof schedulePhoneNumbers>[0]>();

async function status(promise: Promise<unknown>) {
  try {
    const result = await promise;
    return result instanceof Response ? result.status : null;
  } catch (error) {
    return error instanceof Response ? error.status : error;
  }
}

describe("responders", () => {
  test("the list has every responder", async () => {
    const [a, b] = [await createResponder(), await createResponder()];
    const { responders } = await respondersList(respondersListArgs(request));
    expect(responders.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
  });

  test("the page has the responder and their upcoming shifts, soonest first", async () => {
    const hour = 60 * 60 * 1000;
    const schedule = await createSchedule();
    const responder = await createResponder();
    const at = (hours: number) => ({
      start: new Date(Date.now() + hours * hour),
      finish: new Date(Date.now() + (hours + 1) * hour),
      includeStart: true,
      includeFinish: false,
    });
    await createShift(schedule.id, [responder.id], { timespan: at(-5) });
    const later = await createShift(schedule.id, [responder.id], { timespan: at(8) });
    const sooner = await createShift(schedule.id, [responder.id], { timespan: at(2) });

    const data = await responderShow(responderShowArgs(request, { responderId: String(responder.id) }));
    expect(data.responder.id).toBe(responder.id);
    expect(data.upcomingShiftAssignmentsResults.map((r) => r.shifts.id)).toEqual([sooner.id, later.id]);
  });

  test("the show and edit pages 404 for a missing responder", async () => {
    expect(await status(responderShow(responderShowArgs(request, { responderId: "999999" })))).toBe(404);
    expect(await status(responderEdit(responderEditArgs(request, { responderId: "999999" })))).toBe(404);
  });

  test("the edit page has the responder", async () => {
    const responder = await createResponder();
    const data = await responderEdit(responderEditArgs(request, { responderId: String(responder.id) }));
    expect(data.responder.id).toBe(responder.id);
  });
});

describe("phone numbers", () => {
  test("the list has every phone number", async () => {
    const phoneNumber = await createPhoneNumber();
    const { phoneNumbers } = await phoneNumbersList(phoneNumbersListArgs(request));
    expect(phoneNumbers.map((p) => p.id)).toEqual([phoneNumber.id]);
  });

  test("the page has the number, the schedules it's on, and all schedules to add it to", async () => {
    const phoneNumber = await createPhoneNumber();
    const [linked, other] = [await createSchedule(), await createSchedule()];
    await linkPhoneNumber(phoneNumber.id, linked.id);

    const data = await phoneNumberShow(phoneNumberShowArgs(request, { phoneNumberId: String(phoneNumber.id) }));
    expect(data.phoneNumber.phoneNumbersSchedules.map((pns) => pns.schedule.id)).toEqual([linked.id]);
    expect(data.allSchedules.map((s) => s.id).sort()).toEqual([linked.id, other.id].sort());
    expect(data.defaultCountryCode).toBe("US");
  });

  test("the show and edit pages 404 for a missing phone number", async () => {
    expect(await status(phoneNumberShow(phoneNumberShowArgs(request, { phoneNumberId: "999999" })))).toBe(404);
    expect(await status(phoneNumberEdit(phoneNumberEditArgs(request, { phoneNumberId: "999999" })))).toBe(404);
  });
});

describe("schedules", () => {
  test("the list has every schedule", async () => {
    const schedule = await createSchedule();
    const { schedules } = await schedulesList(schedulesListArgs(request));
    expect(schedules.map((s) => s.id)).toEqual([schedule.id]);
  });

  test("the show, edit and duplicate pages have the schedule, or 404", async () => {
    const schedule = await createSchedule();
    const params = { scheduleId: String(schedule.id) };
    expect((await scheduleShow(scheduleShowArgs(request, params))).schedule.id).toBe(schedule.id);
    expect((await scheduleEdit(scheduleEditArgs(request, params))).schedule.id).toBe(schedule.id);
    expect((await scheduleDuplicate(scheduleDuplicateArgs(request, params))).schedule.id).toBe(schedule.id);

    const missing = { scheduleId: "999999" };
    expect(await status(scheduleShow(scheduleShowArgs(request, missing)))).toBe(404);
    expect(await status(scheduleEdit(scheduleEditArgs(request, missing)))).toBe(404);
    expect(await status(scheduleDuplicate(scheduleDuplicateArgs(request, missing)))).toBe(404);
  });

  test("the shifts page has the schedule's shifts with who's on them, and every responder", async () => {
    const schedule = await createSchedule();
    const other = await createSchedule();
    const [a, b] = [await createResponder(), await createResponder()];
    const shift = await createShift(schedule.id, [a.id, b.id]);
    await createShift(other.id, [a.id]);

    const data = await scheduleShifts(scheduleShiftsArgs(request, { scheduleId: String(schedule.id) }));
    if (data instanceof Response) throw new Error("expected data, got a response");
    expect(data.shifts.map((s) => s.id)).toEqual([shift.id]);
    expect(data.shifts[0].shiftAssignments.map((sa) => sa.responder.name)).toEqual([a.name, b.name]);
    expect(data.responders).toHaveLength(2);
  });

  test("the shifts page 404s for a missing schedule", async () => {
    expect(await status(scheduleShifts(scheduleShiftsArgs(request, { scheduleId: "999999" })))).toBe(404);
  });

  test("the phone numbers page has all numbers and the ones on the schedule", async () => {
    const schedule = await createSchedule();
    const [on, off] = [await createPhoneNumber(), await createPhoneNumber()];
    await linkPhoneNumber(on.id, schedule.id);

    const data = await schedulePhoneNumbers(
      schedulePhoneNumbersArgs(request, { scheduleId: String(schedule.id) }),
    );
    expect(data.allPhoneNumbers.map((p) => p.id).sort()).toEqual([on.id, off.id].sort());
    expect(data.schedulePhoneNumbers.map((p) => p.phoneNumber.id)).toEqual([on.id]);
  });
});
