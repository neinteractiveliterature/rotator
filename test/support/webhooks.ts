import { RouterContextProvider } from "react-router";
import { vi } from "vitest";
import type { Transporter } from "nodemailer";
import type { Twilio } from "twilio";
import {
  dbContext,
  defaultCountryCodeContext,
  mailTransportContext,
  twilioClientContext,
} from "~/contexts";
import { db } from "./db";

/** Fakes for the outside world, so tests can assert on the side effects webhook handlers have */
export function buildWebhookContext() {
  const sendMail = vi.fn().mockResolvedValue({});
  const createMessage = vi.fn().mockResolvedValue({});
  const context = new RouterContextProvider();
  context.set(dbContext, db);
  context.set(defaultCountryCodeContext, "US");
  context.set(mailTransportContext, { sendMail } as unknown as Transporter);
  context.set(twilioClientContext, {
    messages: { create: createMessage },
  } as unknown as Twilio);
  return { context, sendMail, createMessage };
}

export function twilioRequest(path: string, params: Record<string, string>) {
  return new Request(`http://localhost/webhooks/${path}`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
}
