import type { MiddlewareFunction } from "react-router";
import { setupOAuth2 } from "./oauth2";
import {
  authenticatorContext,
  dbContext,
  defaultCountryCodeContext,
  mailTransportContext,
  readDbContext,
  oauth2StrategyContext,
} from "~/contexts";
import type { CountryCode } from "libphonenumber-js";
import { createTransport } from "nodemailer";
import { connectDb } from "drizzle/db";

const db = connectDb();

const { authenticator, oauth2Strategy } = await setupOAuth2(db);

const mailTransport = createTransport({
  url: process.env.SMTP_URL,
});

export const initializeContextMiddleware: MiddlewareFunction = async ({
  context,
}) => {
  // Only run on the server
  if (!import.meta.env.SSR) {
    return;
  }

  context.set(authenticatorContext, authenticator);
  context.set(dbContext, db);
  context.set(readDbContext, db);
  if (process.env.DEFAULT_COUNTRY_CODE) {
    context.set(
      defaultCountryCodeContext,
      process.env.DEFAULT_COUNTRY_CODE as CountryCode,
    );
  }
  context.set(mailTransportContext, mailTransport);
  context.set(oauth2StrategyContext, oauth2Strategy);
};
