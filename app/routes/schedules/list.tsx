import { useTranslation } from "react-i18next";
import type { Route } from "./+types/list";
import { Link } from "react-router";
import { dbContext } from "~/contexts";
import BootstrapIcon from "~/components/bootstrap-icon";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const schedules = await db.query.schedulesTable.findMany();
  return { schedules };
}

export default function SchedulesList({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className="mb-4">
        <h1>{t("schedules.title")}</h1>
      </header>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>{t("schedules.name.label")}</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.schedules.map((schedule) => (
            <tr key={schedule.id}>
              <td>
                <Link to={`./${schedule.id}`}>{schedule.name}</Link>
              </td>
              <td className="text-end">
                <Link
                  to={`./${schedule.id}/duplicate`}
                  className="btn btn-sm btn-outline-secondary"
                >
                  <BootstrapIcon name="copy" /> {t("buttons.duplicate")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link className="btn btn-secondary" to="./new">
        <BootstrapIcon name="plus" /> {t("schedules.newButton")}
      </Link>
    </>
  );
}
