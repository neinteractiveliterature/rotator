import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import Home from "~/routes/home";
import { I18nextProvider } from "react-i18next";
import i18n from "~/i18n";

test("Home page renders", async () => {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Home,
    },
  ]);

  render(
    <I18nextProvider i18n={i18n}>
      <Stub initialEntries={["/"]} />
    </I18nextProvider>
  );

  expect(await screen.findByText("Rotator")).toBeInTheDocument();
});
