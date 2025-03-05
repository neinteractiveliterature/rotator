import type { CountryCode } from "libphonenumber-js";
import { setupOAuth2 } from "./oauth2.server";
import { validateTwilioWebhook } from "./validateTwilioWebhook.server";
import type { AppLoadContext, Session } from "react-router";
import type { InferSelectModel } from "drizzle-orm";
import * as schema from "app/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { createTransport } from "nodemailer";
import TwilioClient from "twilio";
import type { UnwrapPromise } from "@neinteractiveliterature/litform";

const db = drizzle({
  connection: process.env.DATABASE_URL!,
  casing: "snake_case",
  schema,
  logger: true,
});

const mailTransport = createTransport({
  url: process.env.SMTP_URL,
});

declare module "react-router" {
  interface AppLoadContext {
    authenticator: UnwrapPromise<
      ReturnType<typeof setupOAuth2>
    >["authenticator"];
    db: typeof db;
    defaultCountryCode: CountryCode;
    getCurrentUser: (
      session: Session
    ) => Promise<InferSelectModel<typeof schema.usersTable> | undefined>;
    mailTransport: typeof mailTransport;
    oauth2Strategy: UnwrapPromise<
      ReturnType<typeof setupOAuth2>
    >["oauth2Strategy"];
    twilioClient: TwilioClient.Twilio;
    validateTwilioWebhook: typeof validateTwilioWebhook;
  }
}

const { authenticator, oauth2Strategy } = await setupOAuth2(db);

export async function buildAppLoadContext(): Promise<AppLoadContext> {
  const twilioClient = TwilioClient(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let currentUser: InferSelectModel<typeof schema.usersTable> | undefined =
    undefined;
  let fetchedCurrentUser = false;

  const getCurrentUser = async (session: Session) => {
    if (fetchedCurrentUser) {
      return currentUser;
    }

    const userId = session.get("userId");

    if (userId) {
      currentUser = await db.query.usersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, userId),
      });
    }

    fetchedCurrentUser = true;
    return currentUser;
  };

  return {
    authenticator,
    db,
    defaultCountryCode:
      (process.env.DEFAULT_COUNTRY_CODE as CountryCode | undefined) ?? "US",
    getCurrentUser,
    mailTransport,
    oauth2Strategy,
    twilioClient,
    validateTwilioWebhook,
  } satisfies AppLoadContext;
}
