import { useTranslation } from "react-i18next";
import type { Route } from "./+types/list";
import { Link } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  const schedules = await context.db.query.schedulesTable.findMany();
  return { schedules };
}

export default function SchedulesList({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className="mb-4">{t("schedules.title")}</header>

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
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
