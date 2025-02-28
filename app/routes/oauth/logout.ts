import { destroySession, getSession } from "~/sessions.server";
import type { Route } from "./+types/logout";
import { redirect } from "react-router";

export async function loader({ request, context }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("cookie"));
  const accessToken = session.get("accessToken");
  if (accessToken) {
    await context.oauth2Strategy.revokeToken(accessToken);
  }

  return redirect("/", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
