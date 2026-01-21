import sortBy from "lodash/sortBy";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import dateTimeFormats from "~/dateTimeFormats";
import { coerceId } from "~/db/utils";
import type { Route } from "./+types/shifts";
import { dbContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);

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

  return { shifts };
}

export default function ScheduleShiftsPage({
  loaderData,
}: Route.ComponentProps) {
  const { shifts } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("schedules.shifts.title")}</h2>

      <table className="table table-striped">
        <thead>
          <th>{t("schedules.shifts.timespan")}</th>
          <th>{t("schedules.shifts.responders")}</th>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id}>
              <td>
                {t("timespan", {
                  timespan: shift.timespan,
                  formatParams: {
                    "timespan.start": dateTimeFormats.short,
                    "timespan.finish": dateTimeFormats.short,
                  },
                })}
              </td>
              <td>
                {sortBy(
                  shift.shiftAssignments,
                  (shiftAssignment) => shiftAssignment.position,
                ).map(({ responder }, index) => (
                  <>
                    {index > 0 && ", "}
                    <Link to={`/responders/${responder.id}`}>
                      {responder.name}
                    </Link>
                  </>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
