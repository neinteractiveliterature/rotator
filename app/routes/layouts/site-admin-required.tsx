import { getSession } from "~/sessions.server";
import type { Route } from "./+types/site-admin-required";
import { redirect } from "react-router";

export async function loader({ context, request }: Route.LoaderArgs) {
  const currentUser = await context.getCurrentUser(
    await getSession(request.headers.get("cookie"))
  );

  if (currentUser?.site_admin) {
    return null;
  } else if (!currentUser) {
    return redirect("/oauth/login");
  } else {
    throw new Response("Access denied", {
      status: 403,
    });
  }
}
