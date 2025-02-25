import { relations } from "drizzle-orm";
import {
  bigint,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const tsRange = customType<{ data: string; notNull: true; default: true }>({
  dataType() {
    return "tsrange";
  },
});

export const phoneNumbersTable = pgTable("phone_numbers", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 255 }).notNull(),
  noActiveShiftMessage: text(),
});

export const phoneNumbersRelations = relations(
  phoneNumbersTable,
  ({ many }) => ({
    phoneNumbersSchedules: many(phoneNumbersSchedulesTable, {
      relationName: "phoneNumber",
    }),
  })
);

export const respondersTable = pgTable("responders", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  phoneNumber: varchar({ length: 255 }).notNull(),
  email: text().notNull(),
});

export const schedulesTable = pgTable("schedules", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const schedulesRelations = relations(schedulesTable, ({ many }) => ({
  shifts: many(shiftsTable, { relationName: "schedule" }),
  phoneNumbersSchedules: many(phoneNumbersSchedulesTable, {
    relationName: "schedule",
  }),
}));

export const phoneNumbersSchedulesTable = pgTable(
  "phone_numbers_schedules",
  {
    phoneNumberId: bigint({ mode: "number" })
      .notNull()
      .references(() => phoneNumbersTable.id),
    scheduleId: bigint({ mode: "number" })
      .notNull()
      .references(() => schedulesTable.id),
  },
  (t) => [primaryKey({ columns: [t.phoneNumberId, t.scheduleId] })]
);

export const phoneNumbersSchedulesRelations = relations(
  phoneNumbersSchedulesTable,
  ({ one }) => ({
    phoneNumber: one(phoneNumbersTable, {
      fields: [phoneNumbersSchedulesTable.phoneNumberId],
      references: [phoneNumbersTable.id],
      relationName: "phoneNumber",
    }),
    schedule: one(schedulesTable, {
      fields: [phoneNumbersSchedulesTable.scheduleId],
      references: [schedulesTable.id],
      relationName: "schedule",
    }),
  })
);

export const shiftsTable = pgTable(
  "shifts",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    scheduleId: bigint({ mode: "number" })
      .notNull()
      .references(() => schedulesTable.id),
    timespan: tsRange().notNull(),
  },
  (t) => [index().using("gist", t.timespan), index().on(t.scheduleId)]
);

export const shiftsRelations = relations(shiftsTable, ({ one }) => ({
  schedule: one(schedulesTable, {
    fields: [shiftsTable.scheduleId],
    references: [schedulesTable.id],
    relationName: "schedule",
  }),
}));

export const shiftAssignmentsTable = pgTable(
  "shift_assignments",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    shiftId: bigint({ mode: "number" })
      .notNull()
      .references(() => shiftsTable.id),
    responderId: bigint({ mode: "number" })
      .notNull()
      .references(() => respondersTable.id),
    position: integer().notNull(),
  },
  (t) => [
    index().on(t.shiftId),
    index().on(t.responderId),
    uniqueIndex().on(t.shiftId, t.responderId, t.position),
  ]
);

export const shiftAssignmentsRelations = relations(
  shiftAssignmentsTable,
  ({ one }) => ({
    shift: one(shiftsTable, {
      fields: [shiftAssignmentsTable.shiftId],
      references: [shiftsTable.id],
    }),
    responder: one(respondersTable, {
      fields: [shiftAssignmentsTable.responderId],
      references: [respondersTable.id],
    }),
  })
);
