import type { InferSelectModel } from "drizzle-orm";
import { Liquid } from "liquidjs";
import {
  activeShiftForSchedule,
  sortShiftAssignments,
} from "~/.server/repositories/onCall.server";
import type { respondersTable } from "~/db/schema";
import { defineJob } from "./defineJob";

export type VoicemailReceivedTemplateVariables = {
  from: string;
  recordingUrlMp3: string;
  recordingUrlWav: string;
  responderIndex: number;
  responder: InferSelectModel<typeof respondersTable>;
};

export type NotifyVoicemailReceivedPayload = {
  scheduleId: number;
  /** The caller's number */
  from: string;
  /** The schedule's number the caller dialed: the texts to responders come from it */
  to: string;
  recordingUrl: string;
  /** When the voicemail arrived (ISO 8601): decides whose shift it was, even if the job runs later */
  receivedAt: string;
};

/** Emails everyone on the active shift a new voicemail, and texts the first responder */
export const notifyVoicemailReceivedJob =
  defineJob<NotifyVoicemailReceivedPayload>({
    name: "notifyVoicemailReceived",
    async handler(payload, { db, mailTransport, twilioClient }) {
      const schedule = await db.query.schedulesTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.scheduleId),
      });
      if (!schedule) {
        return;
      }

      const shift = await activeShiftForSchedule(
        db,
        schedule.id,
        new Date(payload.receivedAt),
      );
      const responders = sortShiftAssignments(shift?.shiftAssignments ?? []);
      if (responders.length === 0) {
        console.warn(
          `Voicemail ${payload.recordingUrl} for schedule ${schedule.id} arrived with nobody on shift`,
        );
        return;
      }

      const liquid = new Liquid();
      const subjectTemplate = liquid.parse(
        schedule.voicemailEmailSubjectTemplate,
      );
      const bodyTemplate = liquid.parse(schedule.voicemailEmailBodyTemplate);
      const varsFor = (
        responder: (typeof responders)[number],
        responderIndex: number,
      ): VoicemailReceivedTemplateVariables => ({
        from: payload.from,
        recordingUrlMp3: payload.recordingUrl + ".mp3",
        recordingUrlWav: payload.recordingUrl,
        responderIndex,
        responder,
      });

      const mailPromises = responders.map((responder, index) => {
        const templateVars = varsFor(responder, index);
        return mailTransport.sendMail({
          from: schedule.emailFrom,
          to: responder.email,
          subject: liquid.renderSync(subjectTemplate, templateVars),
          text: liquid.renderSync(bodyTemplate, templateVars),
        });
      });

      const textPromise = twilioClient.messages.create({
        from: payload.to,
        to: responders[0].phoneNumber,
        body: liquid.parseAndRenderSync(
          schedule.voicemailTextTemplate,
          varsFor(responders[0], 0),
        ),
      });

      await Promise.all([...mailPromises, textPromise]);
    },
  });
