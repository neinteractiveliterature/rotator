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
});

export const MessagingWebhookParams = TwilioWebhookParams.extend({
  Body: z.string(),
});

export const VoiceWebhookParams = TwilioWebhookParams.extend({
  CallStatus: TwimlCallStatus,
});

export const TwilioDialResponseParams = VoiceWebhookParams.extend({
  DialCallStatus: TwimlCallStatus,
});

export const TwilioRecordResponseParams = VoiceWebhookParams.extend({
  RecordingUrl: z.string(),
});
