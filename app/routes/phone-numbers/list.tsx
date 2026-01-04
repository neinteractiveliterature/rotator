import { useTranslation } from "react-i18next";
import type { Route } from "./+types/list";
import { Link } from "react-router";
import { dbContext } from "~/contexts";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const phoneNumbers = await db.query.phoneNumbersTable.findMany();
  return { phoneNumbers };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <title>{[t("phoneNumbers.title"), t("appName")].join(" - ")}</title>
      <h1>{t("phoneNumbers.title")}</h1>
      <ul className="list-group">
        {loaderData.phoneNumbers.map((phoneNumber) => (
          <li key={phoneNumber.id} className="list-group-item">
            <Link to={`/phone_numbers/${phoneNumber.id}`}>
              {phoneNumber.phoneNumber}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
