import { drizzle } from "drizzle-orm/node-postgres";
import { RouterContextProvider } from "react-router";
import * as schema from "app/db/schema";
import { setupOAuth2 } from "./oauth2.server";
import {
  authenticatorContext,
  dbContext,
  defaultCountryCodeContext,
  mailTransportContext,
  oauth2StrategyContext,
  twilioClientContext,
} from "~/contexts";
import type { CountryCode } from "libphonenumber-js";
import { createTransport } from "nodemailer";
import { Twilio } from "twilio";

export async function getLoadContext() {
  const provider = new RouterContextProvider();

  const db = drizzle({
    connection: process.env.DATABASE_URL!,
    casing: "snake_case",
    schema,
    logger: true,
  });

  const { authenticator, oauth2Strategy } = await setupOAuth2(db);

  const mailTransport = createTransport({
    url: process.env.SMTP_URL,
  });

  provider.set(authenticatorContext, authenticator);
  provider.set(dbContext, db);
  if (process.env.DEFAULT_COUNTRY_CODE) {
    provider.set(
      defaultCountryCodeContext,
      process.env.DEFAULT_COUNTRY_CODE as CountryCode
    );
  }
  provider.set(mailTransportContext, mailTransport);
  provider.set(oauth2StrategyContext, oauth2Strategy);
  provider.set(twilioClientContext, new Twilio());

  return provider;
}
