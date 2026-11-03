// @vitest-environment node
import twilio from "twilio";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { validateTwilioWebhook } from "~/.server/validateTwilioWebhook.server";

const authToken = "test-auth-token";
const url = "https://rotator.example.com/webhooks/text";
const params = { From: "+15555550123", To: "+12025550100", Body: "help me" };

const saved = {
  skip: process.env.SKIP_TWILIO_WEBHOOK_VALIDATION,
  token: process.env.TWILIO_AUTH_TOKEN,
};

beforeEach(() => {
  // the suite skips validation by default so other tests needn't sign their requests
  delete process.env.SKIP_TWILIO_WEBHOOK_VALIDATION;
  process.env.TWILIO_AUTH_TOKEN = authToken;
});

afterEach(() => {
  for (const [key, value] of [
    ["SKIP_TWILIO_WEBHOOK_VALIDATION", saved.skip],
    ["TWILIO_AUTH_TOKEN", saved.token],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function signedRequest({
  signature = twilio.getExpectedTwilioSignature(authToken, url, params),
  requestUrl = url,
  headers = {},
}: {
  signature?: string | null;
  requestUrl?: string;
  headers?: Record<string, string>;
} = {}) {
  return new Request(requestUrl, {
    method: "POST",
    body: new URLSearchParams(params),
    headers: {
      ...(signature ? { "X-Twilio-Signature": signature } : {}),
      ...headers,
    },
  });
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

describe("validateTwilioWebhook", () => {
  test("returns the form params of a correctly signed request", async () => {
    expect(await validateTwilioWebhook(signedRequest())).toEqual(params);
  });

  test("rejects a request with no signature as a 400", async () => {
    const error = await rejection(
      validateTwilioWebhook(signedRequest({ signature: null })),
    );
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(400);
  });

  test("rejects a wrong signature as a 403", async () => {
    const error = await rejection(
      validateTwilioWebhook(signedRequest({ signature: "bogus" })),
    );
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(403);
  });

  test("rejects a signature made with a different auth token", async () => {
    const signature = twilio.getExpectedTwilioSignature("other-token", url, params);
    const error = await rejection(validateTwilioWebhook(signedRequest({ signature })));
    expect((error as Response).status).toBe(403);
  });

  test("rejects a signature for different params", async () => {
    const signature = twilio.getExpectedTwilioSignature(authToken, url, {
      ...params,
      Body: "something else",
    });
    const error = await rejection(validateTwilioWebhook(signedRequest({ signature })));
    expect((error as Response).status).toBe(403);
  });

  test("uses X-Forwarded-Proto for the scheme, since the app sits behind a proxy", async () => {
    // Twilio signed the https URL; the app sees the request as http
    const httpUrl = url.replace("https:", "http:");
    const request = signedRequest({
      requestUrl: httpUrl,
      headers: { "X-Forwarded-Proto": "https" },
    });
    expect(await validateTwilioWebhook(request)).toEqual(params);

    const error = await rejection(
      validateTwilioWebhook(signedRequest({ requestUrl: httpUrl })),
    );
    expect((error as Response).status).toBe(403);
  });

  test("skips validation when SKIP_TWILIO_WEBHOOK_VALIDATION is set", async () => {
    process.env.SKIP_TWILIO_WEBHOOK_VALIDATION = "1";
    expect(
      await validateTwilioWebhook(signedRequest({ signature: null })),
    ).toEqual(params);
  });
});
