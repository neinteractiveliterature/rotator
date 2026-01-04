import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "~/styles/application.scss";
import RotateClockwisePNG from "./rotate-clockwise-2.png";
import RotateClockwiseSVG from "./rotate-clockwise-2.svg";

import type { Route } from "./+types/root";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useMemo } from "react";
import {
  buildRotatorGlobalContextValue,
  RotatorGlobalContext,
} from "./global-context";
import { defaultCountryCodeContext } from "./contexts";
import { getCurrentUserMiddleware } from "./server/authMiddleware.server";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href={RotateClockwisePNG} />
          <link rel="icon" type="image/svg+xml" href={RotateClockwiseSVG} />
          <Meta />
          <Links />
        </head>
        <body>
          {children}
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </I18nextProvider>
  );
}

export const middleware = [getCurrentUserMiddleware];

export function loader({ context }: Route.LoaderArgs) {
  const defaultCountryCode = context.get(defaultCountryCodeContext);
  return { defaultCountryCode };
}

export default function App({ loaderData }: Route.ComponentProps) {
  const globalContextValue = useMemo(
    () =>
      buildRotatorGlobalContextValue({
        defaultCountryCode: loaderData.defaultCountryCode,
      }),
    [loaderData.defaultCountryCode]
  );

  return (
    <RotatorGlobalContext.Provider value={globalContextValue}>
      <Outlet />
    </RotatorGlobalContext.Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
