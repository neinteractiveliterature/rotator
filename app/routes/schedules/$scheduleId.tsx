import { assertFound, coerceId } from "~/db/utils";
import type { Route } from "./+types/$scheduleId";
import { NavLink, Outlet, useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { dbContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const schedule = assertFound(
    await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
    }),
  );

  return { schedule };
}

export function useSchedule() {
  const loaderData = useRouteLoaderData(
    "routes/schedules/$scheduleId",
  ) as Route.ComponentProps["loaderData"];
  return loaderData.schedule;
}

export default function ScheduleLayout({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <div className="row">
      <aside className="col-md-3">
        <h2>{loaderData.schedule.name}</h2>
        <ul className="nav flex-column nav-pills">
          <li className="nav-item">
            <NavLink
              to={`/schedules/${loaderData.schedule.id}`}
              end
              className="nav-link"
            >
              {t("schedules.showPage.title")}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to={`/schedules/${loaderData.schedule.id}/edit`}
              className="nav-link"
            >
              {t("schedules.settings.title")}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to={`/schedules/${loaderData.schedule.id}/shifts`}
              className="nav-link"
            >
              {t("schedules.shifts.title")}
            </NavLink>
          </li>
        </ul>
      </aside>
      <main className="col-md-9">
        <Outlet />
      </main>
    </div>
  );
}
