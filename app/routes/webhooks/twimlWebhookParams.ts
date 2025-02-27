import z from "zod";

export const TwimlCallStatus = z.enum([
  "queued",
  "ringing",
  "in-progress",
  "completed",
  "busy",
  "failed",
  "no-answer",
]);

export const TwilioWebhookParams = z.object({
  From: z.string(),
  To: z.string(),
  CallStatus: TwimlCallStatus,
});

export const TwilioDialResponseParams = TwilioWebhookParams.extend({
  DialCallStatus: TwimlCallStatus,
});

export const TwilioRecordResponseParams = TwilioWebhookParams.extend({
  RecordingUrl: z.string(),
});
