import type { Route } from "./+types/voicemail";
import { TwilioRecordResponseParams } from "./twimlWebhookParams";
import { twimlHangupResponse } from "./twimlUtils";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  sortShiftAssignments,
} from "./schedules";
import { Liquid } from "liquidjs";
import type { InferSelectModel } from "drizzle-orm";
import type { respondersTable } from "~/db/schema";

export type VoicemailReceivedTemplateVariables = {
  from: string;
  recordingUrlMp3: string;
  recordingUrlWav: string;
  responderIndex: number;
  responder: InferSelectModel<typeof respondersTable>;
};

export async function action({ context, request }: Route.ActionArgs) {
  const webhookParams = TwilioRecordResponseParams.parse(
    await context.validateTwilioWebhook(request)
  );

  const now = new Date();
  const schedules = await activeSchedulesForPhoneNumber(
    context,
    webhookParams.To,
    now
  );

  if (schedules.length == 0) {
    // TODO
    throw new Error("Figure out wtf to do about this");
  }

  const activeSchedule = schedules[0];

  const liquid = new Liquid();

  const activeShift = await activeShiftForSchedule(
    context,
    activeSchedule.schedules.id,
    now
  );

  const sortedResponders = sortShiftAssignments(
    activeShift?.shiftAssignments ?? []
  );

  const emailSubjectTemplate = liquid.parse(
    activeSchedule.schedules.voicemailEmailSubjectTemplate
  );
  const emailBodyTemplate = liquid.parse(
    activeSchedule.schedules.voicemailEmailBodyTemplate
  );

  const mailPromises = sortedResponders.map((responder, index) => {
    const templateVars: VoicemailReceivedTemplateVariables = {
      from: webhookParams.From,
      recordingUrlMp3: webhookParams.RecordingUrl + ".mp3",
      recordingUrlWav: webhookParams.RecordingUrl,
      responderIndex: index,
      responder,
    };

    return context.mailTransport.sendMail({
      from: activeSchedule.schedules.emailFrom,
      to: responder.email,
      subject: liquid.renderSync(emailSubjectTemplate, templateVars),
      text: liquid.renderSync(emailBodyTemplate, templateVars),
    });
  });

  const textPromise = context.twilioClient.messages.create({
    from: webhookParams.To,
    to: sortedResponders[0].phoneNumber,
    body: liquid.parseAndRenderSync(
      activeSchedule.schedules.voicemailTextTemplate,
      {
        from: webhookParams.From,
        recordingUrlMp3: webhookParams.RecordingUrl + ".mp3",
        recordingUrlWav: webhookParams.RecordingUrl,
        responderIndex: 0,
        responder: sortedResponders[0],
      } satisfies VoicemailReceivedTemplateVariables
    ),
  });

  await Promise.all([...mailPromises, textPromise]);

  return twimlHangupResponse();
}
