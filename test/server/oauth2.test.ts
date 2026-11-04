// @vitest-environment node
import { OAuth2Tokens } from "arctic";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { DBCachedOAuth2Strategy, setupOAuth2, type AuthResult } from "~/.server/oauth2";
import { oauth2ProvidersTable } from "~/db/schema";
import { db, resetDb, rollbackDb, setupDb, teardownDb } from "../support/db";

beforeAll(setupDb);
afterAll(teardownDb);
beforeEach(resetDb);
afterEach(async () => {
  vi.restoreAllMocks();
  await rollbackDb();
});

const issuer = "https://sso.example";
const options = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectURI: "https://rotator.example/oauth/redirect",
  scopes: ["openid", "public"],
};
const verifyNothing = async (): Promise<AuthResult> => {
  throw new Error("verify isn't called in these tests");
};

/** The strategy's configuration, which OAuth2Strategy keeps protected */
const optionsOf = (strategy: DBCachedOAuth2Strategy<AuthResult>) => strategy["options"];

const discoveryDocument = {
  issuer,
  authorization_endpoint: `${issuer}/oauth/authorize`,
  token_endpoint: `${issuer}/oauth/token`,
  revocation_endpoint: `${issuer}/oauth/revoke`,
  code_challenge_methods_supported: ["S256"],
};

function fakeFetch(handlers: Record<string, () => unknown>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = (input instanceof Request ? input.url : input.toString());
    const handler = handlers[url];
    if (!handler) {
      return new Response("not found", { status: 404 });
    }
    return Response.json(handler());
  });
}

describe("DBCachedOAuth2Strategy.loadOrDiscover", () => {
  test("discovers a provider it hasn't seen, and remembers it", async () => {
    const fetch = fakeFetch({ [`${issuer}/.well-known/openid-configuration`]: () => discoveryDocument });

    const strategy = await DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(db, issuer, options, verifyNothing);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(optionsOf(strategy).authorizationEndpoint.toString()).toBe(`${issuer}/oauth/authorize`);
    expect(optionsOf(strategy).tokenEndpoint.toString()).toBe(`${issuer}/oauth/token`);
    expect(optionsOf(strategy).tokenRevocationEndpoint?.toString()).toBe(`${issuer}/oauth/revoke`);

    const [row] = await db.select().from(oauth2ProvidersTable);
    expect(row).toMatchObject({
      url: issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
      tokenRevocationEndpoint: `${issuer}/oauth/revoke`,
    });
  });

  test("uses the remembered provider next time without going to the network", async () => {
    const fetch = fakeFetch({ [`${issuer}/.well-known/openid-configuration`]: () => discoveryDocument });
    const first = await DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(db, issuer, options, verifyNothing);

    const second = await DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(db, issuer, options, verifyNothing);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await db.select().from(oauth2ProvidersTable)).toHaveLength(1);
    expect(optionsOf(second).authorizationEndpoint.toString()).toBe(optionsOf(first).authorizationEndpoint.toString());
    expect(optionsOf(second).tokenEndpoint.toString()).toBe(optionsOf(first).tokenEndpoint.toString());
    expect(optionsOf(second).tokenRevocationEndpoint?.toString()).toBe(optionsOf(first).tokenRevocationEndpoint?.toString());
    expect(optionsOf(second).codeChallengeMethod).toBe(optionsOf(first).codeChallengeMethod);
    // the caller's own options apply either way
    expect(optionsOf(second).clientId).toBe("client-id");
  });

  test("a remembered provider with no revocation endpoint or challenge method stays without them", async () => {
    await db.insert(oauth2ProvidersTable).values({
      url: issuer,
      authorizationEndpoint: `${issuer}/a`,
      tokenEndpoint: `${issuer}/t`,
    });
    const fetch = fakeFetch({});

    const strategy = await DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(db, issuer, options, verifyNothing);

    expect(fetch).not.toHaveBeenCalled();
    expect(optionsOf(strategy).tokenRevocationEndpoint).toBeUndefined();
    expect(optionsOf(strategy).codeChallengeMethod).toBeUndefined();
    expect(() => strategy.revokeToken("token")).toThrow("Token revocation endpoint is not set");
  });

  test("a provider that can't be discovered is an error, and nothing is remembered", async () => {
    fakeFetch({});

    await expect(
      DBCachedOAuth2Strategy.loadOrDiscover<AuthResult>(db, issuer, options, verifyNothing),
    ).rejects.toThrow("Failed to discover issuer");
    expect(await db.select().from(oauth2ProvidersTable)).toHaveLength(0);
  });
});

describe("setupOAuth2", () => {
  // A signing key, and the JWKS endpoint the module reads at import time (OAUTH2_SERVER_BASE is http://localhost in tests)
  const keyId = "test-key";
  let privateKey: CryptoKey;
  let jwks: { keys: unknown[] };

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    privateKey = pair.privateKey;
    jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), kid: keyId, alg: "RS256", use: "sig" }] };
  });

  const savedEnv = { ...process.env };
  beforeEach(() => {
    process.env.OAUTH2_SERVER_BASE = "http://localhost";
    process.env.OAUTH2_CLIENT_ID = "client-id";
    process.env.OAUTH2_CLIENT_SECRET = "client-secret";
    process.env.APP_URL_BASE = "https://rotator.example";
  });
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  async function setup() {
    fakeFetch({
      "http://localhost/.well-known/openid-configuration": () => ({
        ...discoveryDocument,
        issuer: "http://localhost",
      }),
      "http://localhost/oauth/discovery/keys": () => jwks,
    });
    return await setupOAuth2(db);
  }

  async function sign(payload: Record<string, unknown>, { expiresIn = "5m", key = privateKey } = {}) {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: keyId })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key);
  }

  /** Runs the strategy's verify callback as it would run it once the provider has returned tokens */
  async function verify(strategy: DBCachedOAuth2Strategy<AuthResult>, accessToken: string) {
    const tokens = new OAuth2Tokens({ access_token: accessToken, token_type: "Bearer" });
    return await strategy["verify"]({ tokens, request: new Request("https://rotator.example/oauth/redirect") });
  }

  test("builds an authenticator with the OAuth2 strategy, configured from the environment", async () => {
    const { authenticator, oauth2Strategy } = await setup();

    expect(authenticator).toBeDefined();
    expect(optionsOf(oauth2Strategy).clientId).toBe("client-id");
    expect(optionsOf(oauth2Strategy).clientSecret).toBe("client-secret");
    expect(optionsOf(oauth2Strategy).redirectURI?.toString()).toBe("https://rotator.example/oauth/redirect");
    expect(optionsOf(oauth2Strategy).scopes).toEqual(["openid", "public"]);
  });

  test("the verify step returns the user from a validly signed access token", async () => {
    const { oauth2Strategy } = await setup();
    const accessToken = await sign({ user: { id: 42, email: "pat@example.com", name: "Pat" } });

    const result = await verify(oauth2Strategy, accessToken);

    expect(result).toEqual({
      accessToken,
      userPayload: { user: { id: 42, email: "pat@example.com", name: "Pat" } },
    });
  });

  test("a user id can be a string", async () => {
    const { oauth2Strategy } = await setup();
    const accessToken = await sign({ user: { id: "abc", email: "pat@example.com", name: "Pat" } });
    expect((await verify(oauth2Strategy, accessToken)).userPayload.user.id).toBe("abc");
  });

  test("rejects a token signed with some other key", async () => {
    const { oauth2Strategy } = await setup();
    const other = await generateKeyPair("RS256");
    const accessToken = await sign({ user: { id: 1, email: "a@b.c", name: "A" } }, { key: other.privateKey });
    await expect(verify(oauth2Strategy, accessToken)).rejects.toThrow();
  });

  test("rejects an expired token", async () => {
    const { oauth2Strategy } = await setup();
    const accessToken = await sign({ user: { id: 1, email: "a@b.c", name: "A" } }, { expiresIn: "-1m" });
    await expect(verify(oauth2Strategy, accessToken)).rejects.toThrow();
  });

  test("rejects a signed token that doesn't describe a user", async () => {
    const { oauth2Strategy } = await setup();
    const missingEmail = await sign({ user: { id: 1, name: "A" } });
    await expect(verify(oauth2Strategy, missingEmail)).rejects.toThrow();
    const noUser = await sign({ sub: "1" });
    await expect(verify(oauth2Strategy, noUser)).rejects.toThrow();
  });

  test("rejects something that isn't a token", async () => {
    const { oauth2Strategy } = await setup();
    await expect(verify(oauth2Strategy, "not-a-jwt")).rejects.toThrow();
  });
});
