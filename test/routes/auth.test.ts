// @vitest-environment node
import { Authenticator } from "remix-auth";
import { Strategy } from "remix-auth/strategy";
import { RouterContextProvider, redirect } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { getCurrentUserMiddleware } from "~/.server/authMiddleware.server";
import { DBCachedOAuth2Strategy, type AuthResult } from "~/.server/oauth2";
import {
  authenticatorContext,
  currentUserContext,
  dbContext,
  oauth2StrategyContext,
} from "~/contexts";
import { usersTable } from "~/db/schema";
import { loader as siteAdminRequired } from "~/routes/layouts/site-admin-required";
import { loader as login } from "~/routes/oauth/login";
import { loader as logout } from "~/routes/oauth/logout";
import { loader as oauthRedirect } from "~/routes/oauth/redirect";
import { commitSession, getSession } from "~/sessions.server";
import { db, resetDb, rollbackDb, setupDb, teardownDb } from "../support/db";
import { argsFor } from "../support/routes";

beforeAll(setupDb);
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(rollbackDb);

let userCounter = 0;
async function createUser(values: Partial<typeof usersTable.$inferInsert> = {}) {
  const n = ++userCounter;
  const [user] = await db
    .insert(usersTable)
    .values({
      provider: "oauth2",
      uid: String(1000 + n),
      email: `user${n}@example.com`,
      name: `User ${n}`,
      ...values,
    })
    .returning();
  return user;
}

/** A request carrying a session cookie with the given data, as the browser would send it */
async function requestWithSession(data: { userId?: number; accessToken?: string }) {
  const session = await getSession();
  if (data.userId !== undefined) session.set("userId", data.userId);
  if (data.accessToken !== undefined) session.set("accessToken", data.accessToken);
  const setCookie = await commitSession(session);
  return new Request("http://localhost/", { headers: { cookie: setCookie.split(";")[0] } });
}

async function sessionFrom(response: Response) {
  const setCookie = response.headers.get("Set-Cookie") ?? "";
  return await getSession(setCookie.split(";")[0]);
}

describe("getCurrentUserMiddleware", () => {
  async function currentUserFor(request: Request) {
    const context = new RouterContextProvider();
    context.set(dbContext, db);
    await getCurrentUserMiddleware(
      { request, context, params: {}, url: new URL(request.url), pattern: "/" },
      async () => new Response(),
    );
    return context.get(currentUserContext);
  }

  test("loads the user the session names", async () => {
    const user = await createUser();
    const current = await currentUserFor(await requestWithSession({ userId: user.id }));
    expect(current?.id).toBe(user.id);
  });

  test("no session means no current user", async () => {
    expect(await currentUserFor(new Request("http://localhost/"))).toBeNull();
  });

  test("a session naming a user who's gone means no current user", async () => {
    expect(await currentUserFor(await requestWithSession({ userId: 999999 }))).toBeNull();
  });

  test("a tampered cookie means no current user", async () => {
    const user = await createUser();
    const request = await requestWithSession({ userId: user.id });
    const cookie = request.headers.get("cookie")!;
    const tampered = new Request("http://localhost/", {
      headers: { cookie: cookie.replace(/.$/, (c) => (c === "A" ? "B" : "A")) },
    });
    expect(await currentUserFor(tampered)).toBeNull();
  });
});

describe("site admin required layout", () => {
  const args = argsFor<Parameters<typeof siteAdminRequired>[0]>();
  const contextFor = (user: Awaited<ReturnType<typeof createUser>> | null) => {
    const context = new RouterContextProvider();
    context.set(currentUserContext, user);
    return context;
  };
  const request = new Request("http://localhost/schedules");

  test("sends visitors who aren't signed in to log in", async () => {
    const result = await siteAdminRequired(args(request, {}, contextFor(null)));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe("/oauth/login");
  });

  test("refuses signed-in users who aren't site admins", async () => {
    const user = await createUser({ site_admin: false });
    await expect(siteAdminRequired(args(request, {}, contextFor(user)))).rejects.toMatchObject({
      status: 403,
    });
  });

  test("lets site admins through", async () => {
    const user = await createUser({ site_admin: true });
    expect(await siteAdminRequired(args(request, {}, contextFor(user)))).toBeNull();
  });
});

/** Stands in for the OAuth2 flow: "authenticates" every request as the given result */
class FakeOAuth2Strategy extends Strategy<AuthResult, never> {
  name = "oauth2";
  constructor(private result: AuthResult) {
    super(async () => result);
  }
  async authenticate() {
    return this.result;
  }
}

function authenticatorFor(result: AuthResult) {
  const authenticator = new Authenticator<AuthResult>();
  authenticator.use(new FakeOAuth2Strategy(result), "oauth2");
  return authenticator;
}

describe("OAuth redirect", () => {
  const args = argsFor<Parameters<typeof oauthRedirect>[0]>();
  const result = (id: number | string, extra = {}): AuthResult => ({
    accessToken: "token-123",
    userPayload: { user: { id, email: "pat@example.com", name: "Pat", ...extra } },
  });

  function contextFor(authResult: AuthResult) {
    const context = new RouterContextProvider();
    context.set(authenticatorContext, authenticatorFor(authResult));
    context.set(dbContext, db);
    return context;
  }

  test("creates a user the first time someone signs in, and starts their session", async () => {
    const response = (await oauthRedirect(
      args(new Request("http://localhost/oauth/redirect"), {}, contextFor(result(42))),
    )) as Response;

    const user = await db.query.usersTable.findFirst();
    expect(user).toMatchObject({
      provider: "oauth2",
      uid: "42",
      email: "pat@example.com",
      name: "Pat",
      site_admin: false,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    const session = await sessionFrom(response);
    expect(session.get("userId")).toBe(user!.id);
    expect(session.get("accessToken")).toBe("token-123");
  });

  test("signs in the existing user the next time, without making another", async () => {
    const existing = await createUser({ uid: "42" });
    const response = (await oauthRedirect(
      args(new Request("http://localhost/oauth/redirect"), {}, contextFor(result("42"))),
    )) as Response;

    expect(await db.select().from(usersTable)).toHaveLength(1);
    expect((await sessionFrom(response)).get("userId")).toBe(existing.id);
  });
});

describe("OAuth login", () => {
  test("hands the request to the OAuth2 strategy", async () => {
    const authenticator = authenticatorFor({
      accessToken: "x",
      userPayload: { user: { id: 1, email: "a@b.c", name: "A" } },
    });
    const authenticate = vi.spyOn(authenticator, "authenticate").mockRejectedValue(redirect("https://sso.example/authorize"));
    const context = new RouterContextProvider();
    context.set(authenticatorContext, authenticator);
    const request = new Request("http://localhost/oauth/login");

    await expect(
      login(argsFor<Parameters<typeof login>[0]>()(request, {}, context)),
    ).rejects.toMatchObject({ status: 302 });
    expect(authenticate).toHaveBeenCalledWith("oauth2", request);
  });
});

describe("OAuth logout", () => {
  const args = argsFor<Parameters<typeof logout>[0]>();
  function contextWithStrategy() {
    const strategy = new DBCachedOAuth2Strategy<AuthResult>(
      {
        clientId: "id",
        clientSecret: "secret",
        redirectURI: "http://localhost/oauth/redirect",
        authorizationEndpoint: "https://sso.example/authorize",
        tokenEndpoint: "https://sso.example/token",
        scopes: [],
      },
      async () => {
        throw new Error("unused");
      },
    );
    const revokeToken = vi.spyOn(strategy, "revokeToken").mockResolvedValue();
    const context = new RouterContextProvider();
    context.set(oauth2StrategyContext, strategy);
    return { context, revokeToken };
  }

  test("revokes the access token, ends the session and goes home", async () => {
    const { context, revokeToken } = contextWithStrategy();
    const request = await requestWithSession({ userId: 1, accessToken: "token-123" });

    const response = (await logout(args(request, {}, context))) as Response;

    expect(revokeToken).toHaveBeenCalledWith("token-123");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    // the cookie it sets is the expired one that clears the session
    expect(response.headers.get("Set-Cookie")).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });

  test("with no access token there's nothing to revoke", async () => {
    const { context, revokeToken } = contextWithStrategy();
    const response = (await logout(args(new Request("http://localhost/oauth/logout"), {}, context))) as Response;
    expect(revokeToken).not.toHaveBeenCalled();
    expect(response.headers.get("Location")).toBe("/");
  });
});
