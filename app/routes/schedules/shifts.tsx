import { useTranslation } from "react-i18next";
import { coerceId } from "~/db/utils";
import type { Route } from "./+types/shifts";
import { dbContext } from "~/contexts";
import {
  SerializedShift,
  ShiftScheduleTable,
} from "~/components/shift-scheduling";
import { shiftAssignmentsTable, shiftsTable } from "~/db/schema";
import type { TimestampRange } from "~/db/tsRange";
import { serializeError } from "~/components/error-display";
import i18n from "~/i18n";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);

  const schedule = await db.query.schedulesTable.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
  });

  if (!schedule) {
    return new Response(null, { status: 404 });
  }

  const shifts = await db.query.shiftsTable.findMany({
    where: (tbl, { eq }) => eq(tbl.scheduleId, coerceId(params.scheduleId)),
    columns: { id: true, timespan: true },
    with: {
      shiftAssignments: {
        columns: { id: true, responderId: true, position: true },
        with: {
          responder: {
            columns: { id: true, name: true },
          },
        },
      },
    },
  });

  const responders = await db.query.respondersTable.findMany();

  return { shifts, schedule, responders };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 404 });
  }

  const data = SerializedShift.parse(await request.json());
  const db = context.get(dbContext);

  try {
    await db.transaction(async (tx) => {
      const [{ id: shiftId }] = await tx
        .insert(shiftsTable)
        .values({
          scheduleId: Number.parseInt(params.scheduleId),
          timespan: {
            start: new Date(data.timespan.start),
            finish: new Date(data.timespan.finish),
            includeStart: true,
            includeFinish: false,
          } satisfies TimestampRange,
        })
        .returning({ id: shiftsTable.id });

      await tx.insert(shiftAssignmentsTable).values(
        data.shiftAssignments.map((shiftAssignment, index) => ({
          position: index + 1,
          responderId: shiftAssignment.responderId,
          shiftId,
        })),
      );
    });
  } catch (err) {
    return serializeError(err, i18n.t);
  }
}

export default function ScheduleShiftsPage({
  loaderData,
}: Route.ComponentProps) {
  const { shifts, schedule, responders } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("schedules.shifts.title")}</h2>

      <ShiftScheduleTable
        schedule={schedule}
        shifts={shifts}
        responders={responders}
      />
    </>
  );
}
