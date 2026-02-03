import { assertFound, coerceId } from "~/db/utils";
import type { Route } from "./+types/show";
import { Link } from "react-router";
import dateTimeFormats from "~/dateTimeFormats";
import { useTranslation } from "react-i18next";
import {
  schedulesTable,
  shiftAssignmentsTable,
  shiftsTable,
} from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { dbContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);

  const responder = assertFound(
    await db.query.respondersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
    }),
  );
  const upcomingShiftAssignmentsResults = await db
    .select()
    .from(shiftAssignmentsTable)
    .innerJoin(shiftsTable, eq(shiftsTable.id, shiftAssignmentsTable.shiftId))
    .innerJoin(schedulesTable, eq(schedulesTable.id, shiftsTable.scheduleId))
    .where(
      and(
        eq(shiftAssignmentsTable.responderId, coerceId(params.responderId)),
        sql`shifts.timespan && tsrange(now()::timestamp, null)`,
      ),
    )
    .orderBy(shiftsTable.timespan);

  return { responder, upcomingShiftAssignmentsResults };
}

export default function ResponderPage({ loaderData }: Route.ComponentProps) {
  const { responder, upcomingShiftAssignmentsResults } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <title>{responder.name}</title>

      <header className="mb-4">
        <h1>{responder.name}</h1>
      </header>

      <section className="mb-4">
        <div className="d-flex">
          <div className="flex-grow-1">
            <h2>{t("responders.showPage.settingsHeader")}</h2>
          </div>
          <div>
            <Link to="./edit" className="btn btn-primary">
              {t("buttons.edit")}
            </Link>
          </div>
        </div>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>{t("responders.name.label")}</th>
              <th>{t("responders.phoneNumber.label")}</th>
              <th>{t("responders.email.label")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{responder.name}</td>
              <td>{responder.phoneNumber}</td>
              <td>{responder.email}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-2">
        <h2>{t("responders.showPage.upcomingShifts.title")}</h2>

        <table className="table table-striped">
          <thead>
            <tr>
              <th>{t("responders.showPage.upcomingShifts.timeHeader")}</th>
              <th>{t("responders.showPage.upcomingShifts.scheduleHeader")}</th>
              <th>{t("responders.showPage.upcomingShifts.positionHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {upcomingShiftAssignmentsResults.map((row) => {
              const {
                shift_assignments: shiftAssignment,
                shifts: shift,
                schedules: schedule,
              } = row;

              return (
                <tr key={shiftAssignment.id}>
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
                    <Link to={`/schedules/${schedule.id}`}>
                      {schedule.name}
                    </Link>
                  </td>
                  <td>{shiftAssignment.position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
