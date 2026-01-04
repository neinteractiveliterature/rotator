import { useTranslation } from "react-i18next";
import type { Route } from "./+types/show";
import { Link } from "react-router";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import { assertFound, coerceId } from "~/db/utils";
import { dbContext, defaultCountryCodeContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const defaultCountryCode = context.get(defaultCountryCodeContext);
  const phoneNumber = assertFound(
    await db.query.phoneNumbersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.phoneNumberId)),
      with: { phoneNumbersSchedules: { with: { schedule: true } } },
    })
  );

  return { phoneNumber, defaultCountryCode };
}

export default function PhoneNumberPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  const { phoneNumber, defaultCountryCode } = loaderData;
  const parsed = parsePhoneNumberFromString(
    phoneNumber.phoneNumber,
    defaultCountryCode
  )!;

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

        <ul className="list-group">
          {phoneNumber.phoneNumbersSchedules.map(({ schedule }) => (
            <li key={schedule.id} className="list-group-item">
              <Link to={`/schedules/${schedule.id}`}>{schedule.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
