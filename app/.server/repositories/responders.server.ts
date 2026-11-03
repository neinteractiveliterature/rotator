import { and, eq, sql } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import { dbContext } from "~/contexts";
import {
  respondersTable,
  schedulesTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import type { ReadDb } from "~/.server/db";

export async function createResponder(
  context: Readonly<RouterContextProvider>,
  values: typeof respondersTable.$inferInsert,
) {
  const db = context.get(dbContext);
  const [responder] = await db
    .insert(respondersTable)
    .values(values)
    .returning();
  return responder;
}

export async function updateResponder(
  context: Readonly<RouterContextProvider>,
  responderId: number,
  values: Partial<typeof respondersTable.$inferInsert>,
) {
  const db = context.get(dbContext);
  await db
    .update(respondersTable)
    .set(values)
    .where(eq(respondersTable.id, responderId));
}

export async function upcomingShiftAssignmentsForResponder(
  db: ReadDb,
  responderId: number,
) {
  return await db
    .select()
    .from(shiftAssignmentsTable)
    .innerJoin(shiftsTable, eq(shiftsTable.id, shiftAssignmentsTable.shiftId))
    .innerJoin(schedulesTable, eq(schedulesTable.id, shiftsTable.scheduleId))
    .where(
      and(
        eq(shiftAssignmentsTable.responderId, responderId),
        sql`shifts.timespan && tsrange(now()::timestamp, null)`,
      ),
    )
    .orderBy(shiftsTable.timespan);
}
