import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Authenticator } from "remix-auth";
import { OAuth2Strategy } from "remix-auth-oauth2";
import type { Strategy } from "remix-auth/strategy";
import { z } from "zod";
import * as schema from "~/db/schema";

const jwkSet = createRemoteJWKSet(
  new URL("/oauth/discovery/keys", process.env.OAUTH2_SERVER_BASE)
);

const UserPayload = z.object({
  user: z.object({
    id: z.union([z.number(), z.string()]),
    email: z.string(),
    name: z.string(),
  }),
});

type AuthResult = {
  userPayload: z.infer<typeof UserPayload>;
  accessToken: string;
};

class DBCachedOAuth2Strategy<U> extends OAuth2Strategy<U> {
  static async loadOrDiscover<U>(
    db: NodePgDatabase<typeof schema>,
    uri: string | URL,
    options: Pick<
      OAuth2Strategy.ConstructorOptions,
      "clientId" | "clientSecret" | "cookie" | "redirectURI" | "scopes"
    > &
      Partial<
        Omit<
          OAuth2Strategy.ConstructorOptions,
          "clientId" | "clientSecret" | "cookie" | "redirectURI" | "scopes"
        >
      >,
    verify: Strategy.VerifyFunction<U, OAuth2Strategy.VerifyOptions>
  ) {
    const cached = await db.query.oauth2ProvidersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.url, uri.toString()),
    });

    if (cached) {
      return new DBCachedOAuth2Strategy(
        {
          ...options,
          authorizationEndpoint: cached.authorizationEndpoint,
          tokenEndpoint: cached.tokenEndpoint,
          codeChallengeMethod: cached.codeChallengeMethod ?? undefined,
          tokenRevocationEndpoint: cached.tokenRevocationEndpoint ?? undefined,
        },
        verify
      );
    } else {
      const discovered = (await DBCachedOAuth2Strategy.discover(
        uri,
        options,
        verify
      )) as DBCachedOAuth2Strategy<U>;

      await db.insert(schema.oauth2ProvidersTable).values({
        url: uri.toString(),
        authorizationEndpoint:
          discovered.options.authorizationEndpoint.toString(),
        tokenEndpoint: discovered.options.tokenEndpoint.toString(),
        codeChallengeMethod: discovered.options.codeChallengeMethod,
        tokenRevocationEndpoint:
          discovered.options.tokenRevocationEndpoint?.toString(),
      });

      return discovered;
    }
  }
}

export async function setupOAuth2(db: NodePgDatabase<typeof schema>) {
  const oauth2Strategy =
    await DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(
      db,
      process.env.OAUTH2_SERVER_BASE ?? "",
      {
        clientId: process.env.OAUTH2_CLIENT_ID ?? "",
        clientSecret: process.env.OAUTH2_CLIENT_SECRET ?? "",
        redirectURI: new URL("/oauth/redirect", process.env.APP_URL_BASE),
        scopes: ["openid", "public"],
      },
      async ({ tokens }) => {
        const accessToken = tokens.accessToken();
        const { payload } = await jwtVerify(accessToken, jwkSet);
        const userPayload = UserPayload.parse(payload);
        return { userPayload, accessToken };
      }
    );

  const authenticator = new Authenticator<AuthResult>();
  authenticator.use(oauth2Strategy, "oauth2");

  return { authenticator, oauth2Strategy };
}
