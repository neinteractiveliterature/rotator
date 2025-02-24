import { Outlet } from "react-router";

export default function ApplicationLayout() {
  return (
    <>
      <nav className="navbar navbar-expand-lg bg-dark" data-bs-theme="dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            Rotator
          </a>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
