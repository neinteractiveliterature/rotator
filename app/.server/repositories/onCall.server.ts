import type { UnwrapPromise } from "@neinteractiveliterature/litform";
import { eq, and, sql, type InferSelectModel } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import type { ReadDb } from "~/.server/db";
import {
  schedulesTable,
  phoneNumbersSchedulesTable,
  phoneNumbersTable,
  respondersTable,
} from "~/db/schema";

/**
 * The timespan columns are `timestamp` (no zone) holding UTC wall-clock times. Passing a Date straight through would be
 * serialized in the Node process's local zone and then have its offset dropped by the `::timestamp` cast, which is only
 * right when that zone is UTC.
 */
function utcTimestamp(at: Date) {
  return sql`(${at.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

export async function activeSchedulesForPhoneNumber(
  db: ReadDb,
  phoneNumber: string,
  at: Date,
) {
  return await db
    .select()
    .from(schedulesTable)
    .innerJoin(
      phoneNumbersSchedulesTable,
      eq(phoneNumbersSchedulesTable.scheduleId, schedulesTable.id),
    )
    .innerJoin(
      phoneNumbersTable,
      eq(phoneNumbersTable.id, phoneNumbersSchedulesTable.phoneNumberId),
    )
    .where(
      and(
        sql`schedules.timespan @> ${utcTimestamp(at)}`,
        eq(phoneNumbersTable.phoneNumber, phoneNumber),
      ),
    );
}

export async function activeShiftForSchedule(
  db: ReadDb,
  scheduleId: number,
  at: Date,
) {
  return await db.query.shiftsTable.findFirst({
    where: (tbl, { sql, and, eq }) =>
      and(sql`timespan @> ${utcTimestamp(at)}`, eq(tbl.scheduleId, scheduleId)),
    with: {
      shiftAssignments: {
        with: {
          responder: true,
        },
      },
    },
  });
}

export function sortShiftAssignments<T>(
  shiftAssignments: { position: number; responder: T }[],
): T[] {
  return sortBy(
    shiftAssignments,
    (shiftAssignment) => shiftAssignment.position,
  ).map((shiftAssignment) => shiftAssignment.responder);
}

export function bestResponderForShift(
  shift: NonNullable<UnwrapPromise<ReturnType<typeof activeShiftForSchedule>>>,
  afterResponderId?: number,
): InferSelectModel<typeof respondersTable> | undefined {
  const sortedResponders = sortShiftAssignments(shift.shiftAssignments);
  const afterResponderIndex = afterResponderId
    ? (sortedResponders.findIndex(
        (responder) => responder.id === afterResponderId,
      ) ?? -1)
    : -1;
  return sortedResponders[afterResponderIndex + 1];
}
