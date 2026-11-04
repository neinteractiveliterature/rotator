// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Building the context shouldn't open a database connection
vi.mock("drizzle/db", () => ({ connectDb: () => ({}) }));

const saved = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...saved };
});

async function loadGetJobContext() {
  return (await import("~/.server/jobs/jobContext.server")).getJobContext;
}

describe("getJobContext", () => {
  test("builds the Twilio client from the app's TWILIO_SID and TWILIO_AUTH_TOKEN", async () => {
    process.env.TWILIO_SID = "ACtest-account";
    process.env.TWILIO_AUTH_TOKEN = "secret-token";
    delete process.env.TWILIO_ACCOUNT_SID;

    const getJobContext = await loadGetJobContext();
    const { twilioClient } = getJobContext();

    // the SDK keeps the credentials it was built with on the client
    expect(twilioClient).toMatchObject({
      accountSid: "ACtest-account",
      username: "ACtest-account",
      password: "secret-token",
    });
  });

  test("says what's missing instead of building a client that will fail on its first request", async () => {
    delete process.env.TWILIO_SID;
    process.env.TWILIO_AUTH_TOKEN = "secret-token";

    const getJobContext = await loadGetJobContext();
    expect(() => getJobContext()).toThrow("TWILIO_SID and TWILIO_AUTH_TOKEN");
  });

  test("builds the context once and reuses it", async () => {
    process.env.TWILIO_SID = "ACtest-account";
    process.env.TWILIO_AUTH_TOKEN = "secret-token";

    const getJobContext = await loadGetJobContext();
    expect(getJobContext()).toBe(getJobContext());
  });

  test("defaults the country to US, or uses DEFAULT_COUNTRY_CODE", async () => {
    process.env.TWILIO_SID = "ACtest-account";
    process.env.TWILIO_AUTH_TOKEN = "secret-token";

    delete process.env.DEFAULT_COUNTRY_CODE;
    expect((await loadGetJobContext())().defaultCountryCode).toBe("US");

    vi.resetModules();
    process.env.DEFAULT_COUNTRY_CODE = "GB";
    expect((await loadGetJobContext())().defaultCountryCode).toBe("GB");
  });
});
