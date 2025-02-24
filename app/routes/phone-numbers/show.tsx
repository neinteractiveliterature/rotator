import { useTranslation } from "react-i18next";
import type { Route } from "./+types/show";
import { Link } from "react-router";
import { findPhoneNumber } from "./utils";

export async function loader({ context, params }: Route.LoaderArgs) {
  const phoneNumber = await findPhoneNumber(context.db, params.phoneNumberId);
  return { phoneNumber };
}

export default function PhoneNumberPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <h1>{loaderData.phoneNumber.phoneNumber}</h1>

      <table className="table table-bordered">
        <tbody>
          <tr>
            <th scope="row">{t("phoneNumbers.noActiveShiftMessage.label")}</th>
            <td>{loaderData.phoneNumber.noActiveShiftMessage}</td>
          </tr>
        </tbody>
      </table>

      <Link to="./edit" className="btn btn-primary">
        {t("buttons.edit")}
      </Link>
    </>
  );
}
