import { assertFound, coerceId } from "~/db/utils";
import type { Route } from "./+types/show";
import { useTranslation } from "react-i18next";
import sortBy from "lodash/sortBy";
import dateTimeFormats from "~/dateTimeFormats";
import { Link } from "react-router";
<<<<<<< HEAD
import { dbContext } from "~/contexts";
=======
import HighlightedText from "~/components/highlighted-text";
>>>>>>> b3d8c45 (Add HighlightedText component)

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const schedule = assertFound(
    await db.query.schedulesTable.findFirst({
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
        <div className="d-flex">
          <div className="flex-grow-1">
            <h2>{t("schedules.showPage.settingsHeader")}</h2>
          </div>
          <div>
            <Link to="./edit" className="btn btn-primary">
              {t("buttons.edit")}
            </Link>
          </div>
        </div>

        <table className="table table-striped">
          <tbody>
            <tr>
              <th scope="row">{t("schedules.welcomeMessage.label")}</th>
              <td>{schedule.welcomeMessage}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.emailFrom.label")}</th>
              <td>{schedule.emailFrom}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.postCallTextTemplate.label")}</th>
              <td>
                <HighlightedText text={schedule.postCallTextTemplate} />
              </td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.callTimeout.label")}</th>
              <td>{schedule.callTimeout}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.voicemailMessage.label")}</th>
              <td>{schedule.voicemailMessage}</td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.voicemailSilenceTimeout.label")}
              </th>
              <td>{schedule.voicemailSilenceTimeout}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.voicemailNotification.title")}</th>
              <td>
                <dl>
                  <dt>{t("schedules.voicemailEmailSubjectTemplate.label")}</dt>
                  <dd>
                    <HighlightedText
                      text={schedule.voicemailEmailSubjectTemplate}
                    />
                  </dd>

                  <dt>{t("schedules.voicemailEmailBodyTemplate.label")}</dt>
                  <dd>
                    <HighlightedText
                      text={schedule.voicemailEmailBodyTemplate}
                    />
                  </dd>

                  <dt>{t("schedules.voicemailTextTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.voicemailTextTemplate} />
                  </dd>
                </dl>
              </td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.noActiveShiftTextMessage.label")}
              </th>
              <td>{schedule.noActiveShiftTextMessage}</td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.textReceivedNotification.title")}
              </th>
              <td>
                <dl>
                  <dt>{t("schedules.textEmailSubjectTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textEmailSubjectTemplate} />
                  </dd>

                  <dt>{t("schedules.textEmailBodyTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textEmailBodyTemplate} />
                  </dd>

                  <dt>{t("schedules.textResponderTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textResponderTemplate} />
                  </dd>
                </dl>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

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
