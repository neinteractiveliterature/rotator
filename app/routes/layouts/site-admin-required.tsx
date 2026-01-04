import type { Route } from "./+types/site-admin-required";
import { redirect } from "react-router";
import { currentUserContext } from "~/contexts";

export async function loader({ context }: Route.LoaderArgs) {
  const currentUser = context.get(currentUserContext);

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
