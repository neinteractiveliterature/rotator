import { usersTable } from "~/db/schema";
import type { Route } from "./+types/redirect";
import { redirect } from "react-router";
import { commitSession, getSession } from "~/sessions.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { userPayload, accessToken } = await context.authenticator.authenticate(
    "oauth2",
    request
  );

  const existingUser = await context.db.query.usersTable.findFirst({
    where: (tbl, { and, eq }) =>
      and(
        eq(tbl.provider, "oauth2"),
        eq(tbl.uid, userPayload.user.id.toString())
      ),
  });

  const session = await getSession(request.headers.get("cookie"));
  session.set("accessToken", accessToken);

  if (existingUser) {
    session.set("userId", existingUser.id);
  } else {
    const [newUser] = await context.db
      .insert(usersTable)
      .values({
        email: userPayload.user.email,
        name: userPayload.user.name,
        uid: userPayload.user.id.toString(),
        provider: "oauth2",
      })
      .returning({ id: usersTable.id });
    session.set("userId", newUser.id);
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
