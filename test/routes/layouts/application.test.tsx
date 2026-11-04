import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createRoutesStub } from "react-router";
import { describe, expect, test } from "vitest";
import i18n from "~/i18n";
import { argsFor } from "../../support/routes";
import ApplicationLayout, { useCurrentUser } from "~/routes/layouts/application";
import { loader as applicationLoader } from "~/routes/layouts/application";
import { currentUserContext } from "~/contexts";
import { RouterContextProvider } from "react-router";

type LayoutLoaderData = Awaited<ReturnType<typeof applicationLoader>>;

function CurrentUserName() {
  return <p>current: {useCurrentUser()?.name ?? "nobody"}</p>;
}

function renderLayout(user: LayoutLoaderData["user"]) {
  const Stub = createRoutesStub([
    {
      id: "routes/layouts/application",
      path: "/",
      loader: () => ({ user }),
      // The layout's own props are the route's generated ones; the stub supplies the same loaderData
      Component: ApplicationLayout as React.ComponentType,
      children: [{ index: true, Component: CurrentUserName }],
    },
  ]);
  render(
    <I18nextProvider i18n={i18n}>
      <Stub />
    </I18nextProvider>,
  );
}

const admin = { id: 1, provider: "oauth2", uid: "1", email: "pat@example.com", name: "Pat", site_admin: true };

describe("application layout loader", () => {
  const args = (user: typeof admin | null) => {
    const context = new RouterContextProvider();
    context.set(currentUserContext, user);
    return argsFor<Parameters<typeof applicationLoader>[0]>()(new Request("http://localhost/"), {}, context);
  };

  test("gives the page the current user", async () => {
    expect(await applicationLoader(args(admin))).toEqual({ user: admin });
  });

  test("or null when nobody is signed in", async () => {
    expect(await applicationLoader(args(null))).toEqual({ user: null });
  });
});

describe("application layout", () => {
  test("has the main navigation and the page inside it", async () => {
    renderLayout(null);
    expect(await screen.findByRole("link", { name: "Phone numbers" })).toHaveAttribute("href", "/phone_numbers");
    expect(screen.getByRole("link", { name: "Schedules" })).toHaveAttribute("href", "/schedules");
    expect(screen.getByRole("link", { name: "Responders" })).toHaveAttribute("href", "/responders");
    expect(screen.getByRole("link", { name: /Rotator/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("main")).toHaveTextContent("current: nobody");
  });

  test("offers to log in when nobody is signed in", async () => {
    renderLayout(null);
    expect(await screen.findByRole("link", { name: "Log in" })).toHaveAttribute("href", "/oauth/login");
    expect(screen.queryByRole("link", { name: /Log out/ })).not.toBeInTheDocument();
  });

  test("offers to log out, by name, when someone is signed in, and shares them with the page", async () => {
    renderLayout(admin);
    expect(await screen.findByRole("link", { name: "Log out Pat" })).toHaveAttribute("href", "/oauth/logout");
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("current: Pat");
  });

  test("the navbar toggle expands and collapses the menu", async () => {
    const user = userEvent.setup();
    renderLayout(null);
    const toggle = await screen.findByRole("button", { name: "Toggle navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveClass("show");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).not.toHaveClass("show");
  });
});
