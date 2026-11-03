import type { Route } from "./+types/voicemail";
import { TwilioRecordResponseParams } from "./twimlWebhookParams";
import { twimlHangupResponse } from "./twimlUtils";
import { activeSchedulesForPhoneNumber } from "~/.server/repositories/onCall.server";
import {
  notifyVoicemailReceivedJob,
  type VoicemailReceivedTemplateVariables,
} from "~/.server/jobs/notifyVoicemailReceived";
import { validateTwilioWebhook } from "~/.server/validateTwilioWebhook.server";
import { readDbContext } from "~/contexts";

export type { VoicemailReceivedTemplateVariables };

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.get(readDbContext);

  const webhookParams = TwilioRecordResponseParams.parse(
    await validateTwilioWebhook(request),
  );

  const now = new Date();
  const schedules = await activeSchedulesForPhoneNumber(
    db,
    webhookParams.To,
    now,
  );

  if (schedules.length == 0) {
    // TODO
    throw new Error("Figure out wtf to do about this");
  }

  const activeSchedule = schedules[0];

  // The emails and text go out in the background: Twilio retries a webhook that's slow to answer, and doing the sends
  // inline meant a retry sent them again.
  await notifyVoicemailReceivedJob.perform({
    scheduleId: activeSchedule.schedules.id,
    from: webhookParams.From,
    to: webhookParams.To,
    recordingUrl: webhookParams.RecordingUrl,
    receivedAt: now.toISOString(),
  });

  return twimlHangupResponse();
}
