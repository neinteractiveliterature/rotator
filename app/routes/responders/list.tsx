import { Link } from "react-router";
import type { Route } from "./+types/list";
import { useTranslation } from "react-i18next";
import { dbContext } from "~/contexts";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const responders = await db.query.respondersTable.findMany();
  return { responders };
}

export default function ResponderListPage({
  loaderData,
}: Route.ComponentProps) {
  const { responders } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <title>{t("responders.title")}</title>

      <header className="mb-4">
        <h1>{t("responders.title")}</h1>
      </header>

      <section className="mb-2">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>{t("responders.respondersTable.nameHeader")}</th>
              <th>{t("responders.respondersTable.phoneNumberHeader")}</th>
              <th>{t("responders.respondersTable.emailHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {responders.map((responder) => (
              <tr key={responder.id}>
                <td>
                  <Link to={`/responders/${responder.id}`}>
                    {responder.name}
                  </Link>
                </td>
                <td>{responder.phoneNumber}</td>
                <td>{responder.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link to="/responders/new" className="btn btn-secondary">
          <i className="bi-plus" /> {t("responders.newPage.title")}
        </Link>
      </section>
    </>
  );
}
