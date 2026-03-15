import { useTranslation } from "react-i18next";
import type { Route } from "./+types/show";
import { Form, Link } from "react-router";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import { assertFound, coerceId } from "~/db/utils";
import { dbContext, defaultCountryCodeContext } from "~/contexts";
import { phoneNumbersSchedulesTable, schedulesTable } from "~/db/schema";
import { and, eq } from "drizzle-orm";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const defaultCountryCode = context.get(defaultCountryCodeContext);

  const [phoneNumberResult, allSchedules] = await Promise.all([
    db.query.phoneNumbersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.phoneNumberId)),
      with: { phoneNumbersSchedules: { with: { schedule: true } } },
    }),
    db.query.schedulesTable.findMany(),
  ]);

  const phoneNumber = assertFound(phoneNumberResult);

  return { phoneNumber, defaultCountryCode, allSchedules };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  const formData = await request.formData();
  const phoneNumberId = coerceId(params.phoneNumberId);
  const scheduleId = coerceId(formData.get("scheduleId")?.toString() ?? "");

  if (request.method === "POST") {
    await db
      .insert(phoneNumbersSchedulesTable)
      .values({ phoneNumberId, scheduleId })
      .onConflictDoNothing();
  } else if (request.method === "DELETE") {
    await db
      .delete(phoneNumbersSchedulesTable)
      .where(
        and(
          eq(phoneNumbersSchedulesTable.phoneNumberId, phoneNumberId),
          eq(phoneNumbersSchedulesTable.scheduleId, scheduleId)
        )
      );
  }

  return null;
}

export default function PhoneNumberPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  const { phoneNumber, defaultCountryCode, allSchedules } = loaderData;
  const parsed = parsePhoneNumberFromString(
    phoneNumber.phoneNumber,
    defaultCountryCode
  )!;

  const associatedIds = new Set(
    phoneNumber.phoneNumbersSchedules.map((pns) => pns.scheduleId)
  );
  const unassociatedSchedules = allSchedules.filter(
    (s) => !associatedIds.has(s.id)
  );

  return (
    <>
      <header className="mb-4">
        <h1>{formatPhoneNumberForDisplay(parsed, defaultCountryCode)}</h1>
      </header>

      <section className="mb-4">
        <table className="table table-bordered">
          <tbody>
            <tr>
              <th scope="row">
                {t("phoneNumbers.noActiveShiftMessage.label")}
              </th>
              <td>{phoneNumber.noActiveShiftMessage}</td>
            </tr>
          </tbody>
        </table>

        <Link to="./edit" className="btn btn-primary">
          {t("buttons.edit")}
        </Link>
      </section>

      <section className="mb-4">
        <h2>{t("phoneNumbers.schedules.title")}</h2>

        <ul className="list-group mb-3">
          {phoneNumber.phoneNumbersSchedules.map(({ schedule }) => (
            <li
              key={schedule.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <Link to={`/schedules/${schedule.id}`}>{schedule.name}</Link>
              <Form method="DELETE">
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <button type="submit" className="btn btn-sm btn-danger">
                  {t("phoneNumbers.schedules.disassociate")}
                </button>
              </Form>
            </li>
          ))}
          {phoneNumber.phoneNumbersSchedules.length === 0 && (
            <li className="list-group-item text-muted">
              {t("phoneNumbers.schedules.none")}
            </li>
          )}
        </ul>

        {unassociatedSchedules.length > 0 && (
          <Form method="POST" className="d-flex gap-2 align-items-end">
            <div>
              <label className="form-label">
                {t("phoneNumbers.schedules.addLabel")}
              </label>
              <select name="scheduleId" className="form-select">
                {unassociatedSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              {t("phoneNumbers.schedules.associate")}
            </button>
          </Form>
        )}
      </section>
    </>
  );
}
