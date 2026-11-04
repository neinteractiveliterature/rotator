import { RouterContextProvider } from "react-router";
import { dbContext, defaultCountryCodeContext, readDbContext } from "~/contexts";
import { db } from "./db";

/** A router context like the app's, on the test database */
export function buildRouteContext() {
  const context = new RouterContextProvider();
  context.set(dbContext, db);
  context.set(readDbContext, db);
  context.set(defaultCountryCodeContext, "US");
  return context;
}

/**
 * Builds the args for calling a route module's loader or action directly. They're typed with React Router's generated
 * Route.ActionArgs, which has more than a test supplies; `Args` is that type for the route being called.
 */
export function argsFor<Args>() {
  return (
    request: Request,
    params: Record<string, string> = {},
    context: RouterContextProvider = buildRouteContext(),
  ) => ({ context, request, params }) as Args;
}

export function formRequest(
  method: string,
  fields: Record<string, string>,
  url = "http://localhost/",
) {
  return new Request(url, { method, body: new URLSearchParams(fields) });
}

export function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
