import type { MiddlewareFunction } from "react-router";
import { currentUserContext, dbContext } from "~/contexts";
import { getSession } from "~/sessions.server";

export const getCurrentUserMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  // Only run on the server
  if (!import.meta.env.SSR) {
    return;
  }

  const db = context.get(dbContext);
  const session = await getSession(request.headers.get("cookie"));
  const userId = session.get("userId");

  if (userId) {
    const currentUser = await db.query.usersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, userId),
    });
    context.set(currentUserContext, currentUser ?? null);
  }
};
