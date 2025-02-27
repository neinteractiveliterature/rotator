import { assertFound, coerceId } from "~/db/utils";
import type { Route } from "./+types/show";
import { useTranslation } from "react-i18next";
import sortBy from "lodash/sortBy";
import dateTimeFormats from "~/dateTimeFormats";

export async function loader({ context, params }: Route.LoaderArgs) {
  const schedule = assertFound(
    await context.db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
      with: {
        phoneNumbersSchedules: {
          columns: {},
          with: {
            phoneNumber: { columns: { phoneNumber: true } },
          },
        },
        shifts: {
          columns: { id: true, timespan: true },
          with: {
            shiftAssignments: {
              columns: { responderId: true, position: true },
              with: {
                responder: {
                  columns: { name: true },
                },
              },
            },
          },
        },
      },
    })
  );

  return { schedule };
}

export default function SchedulePage({ loaderData }: Route.ComponentProps) {
  const { schedule } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <title>{schedule.name}</title>

      <header className="mb-4">
        <h1>{schedule.name}</h1>
      </header>

      <section className="mb-2">
        <h2>{t("schedules.shifts.title")}</h2>

        <table className="table table-striped">
          <thead>
            <th>{t("schedules.shifts.timespan")}</th>
            <th>{t("schedules.shifts.responders")}</th>
          </thead>
          <tbody>
            {schedule.shifts.map((shift) => (
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
                    (shiftAssignment) => shiftAssignment.position
                  )
                    .map(({ responder }) => responder.name)
                    .join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
