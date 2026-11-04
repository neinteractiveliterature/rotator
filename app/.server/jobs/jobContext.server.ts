import type { CountryCode } from "libphonenumber-js";
import { createTransport, type SendMailOptions } from "nodemailer";
import Twilio from "twilio";
import type { MessageListInstanceCreateOptions } from "twilio/lib/rest/api/v2010/account/message";
import { connectDb } from "drizzle/db";
import type { Db } from "~/.server/db";

/**
 * A background job's dependencies: built once per Lambda instance (or once per process under the "async" adapter) and
 * passed to whichever job's handler runs.
 */
export type JobContext = {
  db: Db;
  mailTransport: { sendMail(options: SendMailOptions): Promise<unknown> };
  twilioClient: {
    messages: {
      create(params: MessageListInstanceCreateOptions): Promise<unknown>;
    };
  };
  defaultCountryCode: CountryCode;
};

// Built from the app's own TWILIO_SID and TWILIO_AUTH_TOKEN. (Called with no arguments the Twilio SDK reads
// TWILIO_ACCOUNT_SID instead, a name this app has never set, and then fails on its first request.)
function buildTwilioClient() {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_SID and TWILIO_AUTH_TOKEN must be set to send texts");
  }
  return new Twilio.Twilio(accountSid, authToken);
}

let jobContext: JobContext | undefined;

export function getJobContext(): JobContext {
  jobContext ??= {
    db: connectDb(),
    mailTransport: createTransport({ url: process.env.SMTP_URL }),
    twilioClient: buildTwilioClient(),
    defaultCountryCode: (process.env.DEFAULT_COUNTRY_CODE ??
      "US") as CountryCode,
  };
  return jobContext;
}
