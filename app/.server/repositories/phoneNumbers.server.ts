import { and, eq } from "drizzle-orm";
import type { RouterContextProvider } from "react-router";
import { dbContext } from "~/contexts";
import { phoneNumbersSchedulesTable, phoneNumbersTable } from "~/db/schema";

export async function updatePhoneNumber(
  context: Readonly<RouterContextProvider>,
  phoneNumberId: number,
  values: Partial<typeof phoneNumbersTable.$inferInsert>,
) {
  const db = context.get(dbContext);
  await db
    .update(phoneNumbersTable)
    .set(values)
    .where(eq(phoneNumbersTable.id, phoneNumberId));
}

export async function addPhoneNumberToSchedule(
  context: Readonly<RouterContextProvider>,
  phoneNumberId: number,
  scheduleId: number,
) {
  const db = context.get(dbContext);
  await db
    .insert(phoneNumbersSchedulesTable)
    .values({ phoneNumberId, scheduleId })
    .onConflictDoNothing();
}

export async function removePhoneNumberFromSchedule(
  context: Readonly<RouterContextProvider>,
  phoneNumberId: number,
  scheduleId: number,
) {
  const db = context.get(dbContext);
  await db
    .delete(phoneNumbersSchedulesTable)
    .where(
      and(
        eq(phoneNumbersSchedulesTable.phoneNumberId, phoneNumberId),
        eq(phoneNumbersSchedulesTable.scheduleId, scheduleId),
      ),
    );
}
