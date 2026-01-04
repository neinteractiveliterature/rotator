// validateTwilioWebhook: typeof validateTwilioWebhook;

import { createContext } from "react-router";
import type { Authenticator } from "remix-auth";
import {
  DBCachedOAuth2Strategy,
  type AuthResult,
} from "./server/oauth2.server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "app/db/schema";
import type { CountryCode } from "libphonenumber-js";
import type { Transporter } from "nodemailer";
import type { Twilio } from "twilio";
import type { InferSelectModel } from "drizzle-orm";

export const authenticatorContext = createContext<Authenticator<AuthResult>>();
export const currentUserContext = createContext<
  InferSelectModel<typeof schema.usersTable> | undefined
>();
export const dbContext = createContext<NodePgDatabase<typeof schema>>();
export const defaultCountryCodeContext = createContext<CountryCode>("US");
export const mailTransportContext = createContext<Transporter>();
export const oauth2StrategyContext =
  createContext<DBCachedOAuth2Strategy<AuthResult>>();
export const twilioClientContext = createContext<Twilio>();
