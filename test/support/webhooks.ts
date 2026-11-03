import { RouterContextProvider } from "react-router";
import { vi } from "vitest";
import type { JobContext } from "~/.server/jobs/jobContext.server";
import { defaultCountryCodeContext, readDbContext } from "~/contexts";
import { db } from "./db";

export function buildWebhookContext() {
  const context = new RouterContextProvider();
  context.set(readDbContext, db);
  context.set(defaultCountryCodeContext, "US");
  return context;
}

/** A job context on the test database, with fakes for the outside world so tests can assert on what a job sent */
export function buildJobContext() {
  const sendMail = vi.fn<JobContext["mailTransport"]["sendMail"]>();
  const createMessage =
    vi.fn<JobContext["twilioClient"]["messages"]["create"]>();
  const ctx: JobContext = {
    db,
    mailTransport: { sendMail },
    twilioClient: { messages: { create: createMessage } },
    defaultCountryCode: "US",
  };
  return { ctx, sendMail, createMessage };
}

export function twilioRequest(path: string, params: Record<string, string>) {
  return new Request(`http://localhost/webhooks/${path}`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
}
