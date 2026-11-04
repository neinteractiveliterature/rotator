import {
  phoneNumbersSchedulesTable,
  phoneNumbersTable,
  respondersTable,
  schedulesTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import { db } from "./db";

// Small helpers for the rows tests need, so a test can say what matters to it and leave the rest to defaults.

let counter = 0;
const next = () => ++counter;

export async function createPhoneNumber(
  values: Partial<typeof phoneNumbersTable.$inferInsert> = {},
) {
  const [phoneNumber] = await db
    .insert(phoneNumbersTable)
    .values({
      phoneNumber: `+1202555${String(next()).padStart(4, "0")}`,
      ...values,
    })
    .returning();
  return phoneNumber;
}

export async function createResponder(
  values: Partial<typeof respondersTable.$inferInsert> = {},
) {
  const n = next();
  const [responder] = await db
    .insert(respondersTable)
    .values({
      name: `Responder ${n}`,
      phoneNumber: `+1303555${String(n).padStart(4, "0")}`,
      email: `responder${n}@example.com`,
      ...values,
    })
    .returning();
  return responder;
}

const oneDayMs = 24 * 60 * 60 * 1000;

/** A timespan that is active now by default (from a day ago to a day from now) */
export function activeTimespan(now = new Date()) {
  return {
    start: new Date(now.getTime() - oneDayMs),
    finish: new Date(now.getTime() + oneDayMs),
    includeStart: true,
    includeFinish: false,
  };
}

export async function createSchedule(
  values: Partial<typeof schedulesTable.$inferInsert> = {},
) {
  const [schedule] = await db
    .insert(schedulesTable)
    .values({
      name: `Schedule ${next()}`,
      timespan: activeTimespan(),
      welcomeMessage: "Welcome",
      voicemailMessage: "Leave a message",
      callTimeout: 20,
      voicemailSilenceTimeout: 5,
      postCallTextTemplate: "Call from {{ from }} ended",
      voicemailTextTemplate: "Voicemail from {{ from }}: {{ recordingUrlMp3 }}",
      emailFrom: "rotator@example.com",
      voicemailEmailSubjectTemplate: "Voicemail from {{ from }}",
      voicemailEmailBodyTemplate: "Listen: {{ recordingUrlMp3 }}",
      noActiveShiftTextMessage: "Nobody is on call",
      textEmailSubjectTemplate: "Text from {{ from }}",
      textEmailBodyTemplate: "{{ body }}",
      textResponderTemplate: "Text from {{ from }}: {{ body }}",
      timeZone: "UTC",
      ...values,
    })
    .returning();
  return schedule;
}

export async function linkPhoneNumber(
  phoneNumberId: number,
  scheduleId: number,
) {
  await db
    .insert(phoneNumbersSchedulesTable)
    .values({ phoneNumberId, scheduleId });
}

/** Creates a shift (active now by default) with the given responders assigned in order */
export async function createShift(
  scheduleId: number,
  responderIds: number[],
  values: Partial<typeof shiftsTable.$inferInsert> = {},
) {
  const [shift] = await db
    .insert(shiftsTable)
    .values({ scheduleId, timespan: activeTimespan(), ...values })
    .returning();
  if (responderIds.length > 0) {
    await db.insert(shiftAssignmentsTable).values(
      responderIds.map((responderId, position) => ({
        shiftId: shift.id,
        responderId,
        position,
      })),
    );
  }
  return shift;
}

/** A schedule with a phone number and an active shift staffed by `responderCount` responders */
export async function createStaffedSchedule(responderCount = 2) {
  const phoneNumber = await createPhoneNumber();
  const schedule = await createSchedule();
  await linkPhoneNumber(phoneNumber.id, schedule.id);
  const responders = [];
  for (let i = 0; i < responderCount; i++) {
    responders.push(await createResponder());
  }
  const shift = await createShift(
    schedule.id,
    responders.map((r) => r.id),
  );
  return { phoneNumber, schedule, responders, shift };
}
