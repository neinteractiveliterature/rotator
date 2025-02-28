import type { UnwrapPromise } from "@neinteractiveliterature/litform";
import { eq, and, sql, type InferSelectModel } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import type { AppLoadContext } from "react-router";
import {
  schedulesTable,
  phoneNumbersSchedulesTable,
  phoneNumbersTable,
  respondersTable,
} from "~/db/schema";

export async function activeSchedulesForPhoneNumber(
  context: AppLoadContext,
  phoneNumber: string,
  at: Date
) {
  return await context.db
    .select()
    .from(schedulesTable)
    .innerJoin(
      phoneNumbersSchedulesTable,
      eq(phoneNumbersSchedulesTable.scheduleId, schedulesTable.id)
    )
    .innerJoin(
      phoneNumbersTable,
      eq(phoneNumbersTable.id, phoneNumbersSchedulesTable.phoneNumberId)
    )
    .where(
      and(
        sql`schedules.timespan @> ${at}::timestamp`,
        eq(phoneNumbersTable.phoneNumber, phoneNumber)
      )
    );
}

export async function activeShiftForSchedule(
  context: AppLoadContext,
  scheduleId: number,
  at: Date
) {
  return await context.db.query.shiftsTable.findFirst({
    where: (tbl, { sql, and, eq }) =>
      and(sql`timespan @> ${at}::timestamp`, eq(tbl.scheduleId, scheduleId)),
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
  shiftAssignments: { position: number; responder: T }[]
): T[] {
  return sortBy(
    shiftAssignments,
    (shiftAssignment) => shiftAssignment.position
  ).map((shiftAssignment) => shiftAssignment.responder);
}

export function bestResponderForShift(
  shift: NonNullable<UnwrapPromise<ReturnType<typeof activeShiftForSchedule>>>,
  afterResponderId?: number
): InferSelectModel<typeof respondersTable> | undefined {
  const sortedResponders = sortShiftAssignments(shift.shiftAssignments);
  const afterResponderIndex = afterResponderId
    ? sortedResponders.findIndex(
        (responder) => responder.id === afterResponderId
      ) ?? -1
    : -1;
  return sortedResponders[afterResponderIndex + 1];
}
