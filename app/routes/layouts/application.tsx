import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import RotateClockwiseSVG from "~/rotate-clockwise-2.svg";
import classNames from "classnames";
import type { Route } from "./+types/application";
import { getSession } from "~/sessions.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("cookie"));

  if (session) {
    const userId = session.get("userId");

    if (userId) {
      const user = await context.db.query.usersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, userId),
      });

      return { user };
    }
  }

  return { user: undefined };
}

export function useCurrentUser() {
  const loaderData = useRouteLoaderData(
    "routes/layouts/application"
  ) as Route.ComponentProps["loaderData"];
  return loaderData.user;
}

export default function ApplicationLayout({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const [navbarExpanded, setNavbarExpanded] = useState(false);
  const navbarContentId = useId();

  return (
    <>
      <nav
        className="navbar navbar-expand-lg bg-dark mb-4"
        data-bs-theme="dark"
      >
        <div className="container">
          <Link className="navbar-brand" to="/">
            <img src={RotateClockwiseSVG} style={{ filter: "invert(1)" }} />{" "}
            {t("appName")}
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => {
              setNavbarExpanded((prevExpanded) => !prevExpanded);
            }}
            aria-controls={navbarContentId}
            aria-expanded={navbarExpanded}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div
            className={classNames("collapse navbar-collapse", {
              show: navbarExpanded,
            })}
            id={navbarContentId}
          >
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/phone_numbers">
                  {t("phoneNumbers.title")}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/schedules">
                  {t("schedules.title")}
                </NavLink>
              </li>
            </ul>
            <div className="navbar-nav">
              {loaderData.user ? (
                <NavLink className="nav-link" to="/oauth/logout">
                  {t("auth.logoutLink", { name: loaderData.user.name })}
                </NavLink>
              ) : (
                <NavLink className="nav-link" to="/oauth/login">
                  {t("auth.loginLink")}
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
