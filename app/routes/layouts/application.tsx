import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router";
import RotateClockwiseSVG from "~/rotate-clockwise-2.svg";
import classNames from "classnames";

export default function ApplicationLayout() {
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
                <NavLink className="nav-link" to="/">
                  {t("phoneNumbers.title")}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/schedules">
                  {t("schedules.title")}
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
