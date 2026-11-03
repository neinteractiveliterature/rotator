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

let jobContext: JobContext | undefined;

export function getJobContext(): JobContext {
  jobContext ??= {
    db: connectDb(),
    mailTransport: createTransport({ url: process.env.SMTP_URL }),
    // The app's secret is named TWILIO_SID, which the Twilio SDK doesn't look for on its own (it reads TWILIO_ACCOUNT_SID)
    twilioClient: new Twilio.Twilio(
      process.env.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN,
    ),
    defaultCountryCode: (process.env.DEFAULT_COUNTRY_CODE ??
      "US") as CountryCode,
  };
  return jobContext;
}
