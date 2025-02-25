import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router";

export default function ApplicationLayout() {
  const { t } = useTranslation();
  return (
    <>
      <nav
        className="navbar navbar-expand-lg bg-dark mb-4"
        data-bs-theme="dark"
      >
        <div className="container">
          <Link className="navbar-brand" to="/">
            {t("appName")}
          </Link>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
