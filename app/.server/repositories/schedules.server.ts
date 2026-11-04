import { eq } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import { dbContext } from "~/contexts";
import {
  schedulesTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import type { TimestampRange } from "~/db/tsRange";
import { assertFound } from "~/db/utils";

export async function createSchedule(
  context: Readonly<RouterContextProvider>,
  values: typeof schedulesTable.$inferInsert,
) {
  const db = context.get(dbContext);
  const [schedule] = await db.insert(schedulesTable).values(values).returning();
  return schedule;
}

export async function updateSchedule(
  context: Readonly<RouterContextProvider>,
  scheduleId: number,
  values: Partial<typeof schedulesTable.$inferInsert>,
) {
  const db = context.get(dbContext);
  await db
    .update(schedulesTable)
    .set(values)
    .where(eq(schedulesTable.id, scheduleId));
}

/** Copies a schedule (not its shifts or phone numbers), applying `overrides` to the copy */
export async function duplicateSchedule(
  context: Readonly<RouterContextProvider>,
  scheduleId: number,
  overrides: Partial<typeof schedulesTable.$inferInsert>,
) {
  const db = context.get(dbContext);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _unusedId, ...prevSchedule } = assertFound(
    await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, scheduleId),
    }),
  );

  return await createSchedule(context, { ...prevSchedule, ...overrides });
}

export type ShiftInput = {
  timespan: { start: Date; finish: Date };
  responderIds: number[];
};

function shiftTimespan({ start, finish }: ShiftInput["timespan"]) {
  return {
    start,
    finish,
    includeStart: true,
    includeFinish: false,
  } satisfies TimestampRange;
}

function assignments(shiftId: number, responderIds: number[]) {
  return responderIds.map((responderId, index) => ({
    position: index + 1,
    responderId,
    shiftId,
  }));
}

export async function createShift(
  context: Readonly<RouterContextProvider>,
  scheduleId: number,
  input: ShiftInput,
) {
  const db = context.get(dbContext);
  return await db.transaction(async (tx) => {
    const [shift] = await tx
      .insert(shiftsTable)
      .values({ scheduleId, timespan: shiftTimespan(input.timespan) })
      .returning();

    if (input.responderIds.length > 0) {
      await tx
        .insert(shiftAssignmentsTable)
        .values(assignments(shift.id, input.responderIds));
    }
    return shift;
  });
}

export async function updateShift(
  context: Readonly<RouterContextProvider>,
  shiftId: number,
  input: ShiftInput,
) {
  const db = context.get(dbContext);
  await db.transaction(async (tx) => {
    await tx
      .update(shiftsTable)
      .set({ timespan: shiftTimespan(input.timespan) })
      .where(eq(shiftsTable.id, shiftId));

    await tx
      .delete(shiftAssignmentsTable)
      .where(eq(shiftAssignmentsTable.shiftId, shiftId));

    if (input.responderIds.length > 0) {
      await tx
        .insert(shiftAssignmentsTable)
        .values(assignments(shiftId, input.responderIds));
    }
  });
}

export async function deleteShift(
  context: Readonly<RouterContextProvider>,
  shiftId: number,
) {
  const db = context.get(dbContext);
  await db.transaction(async (tx) => {
    await tx
      .delete(shiftAssignmentsTable)
      .where(eq(shiftAssignmentsTable.shiftId, shiftId));
    await tx.delete(shiftsTable).where(eq(shiftsTable.id, shiftId));
  });
}
