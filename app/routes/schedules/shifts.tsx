import { useTranslation } from "react-i18next";
import { coerceId } from "~/db/utils";
import type { Route } from "./+types/shifts";
import { dbContext } from "~/contexts";
import { ShiftScheduleTable } from "~/components/shift-scheduling";

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
        columns: { responderId: true, position: true },
        with: {
          responder: {
            columns: { id: true, name: true },
          },
        },
      },
    },
  });

  return { shifts, schedule };
}

export default function ScheduleShiftsPage({
  loaderData,
}: Route.ComponentProps) {
  const { shifts, schedule } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("schedules.shifts.title")}</h2>

      <ShiftScheduleTable schedule={schedule} shifts={shifts} />
    </>
  );
}
