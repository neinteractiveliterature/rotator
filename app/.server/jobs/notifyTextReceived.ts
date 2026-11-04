import type { InferSelectModel } from "drizzle-orm";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Liquid } from "liquidjs";
import {
  activeShiftForSchedule,
  sortShiftAssignments,
} from "~/.server/repositories/onCall.server";
import type { respondersTable } from "~/db/schema";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import { defineJob } from "./defineJob";

export type TextReceivedTemplateVariables = {
  from: string;
  body: string;
  responderIndex: number;
  responder: InferSelectModel<typeof respondersTable>;
};

export type NotifyTextReceivedPayload = {
  scheduleId: number;
  /** The texter's number, as Twilio sent it */
  from: string;
  body: string;
  /** When the text arrived (ISO 8601): decides whose shift it was, even if the job runs later */
  receivedAt: string;
};

/** Emails everyone on the active shift a text that came in to the schedule's number */
export const notifyTextReceivedJob = defineJob<NotifyTextReceivedPayload>({
  name: "notifyTextReceived",
  async handler(payload, { db, mailTransport, defaultCountryCode }) {
    const schedule = await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, payload.scheduleId),
    });
    if (!schedule) {
      // deleted since the text arrived: nothing left to notify about
      return;
    }

    const shift = await activeShiftForSchedule(
      db,
      schedule.id,
      new Date(payload.receivedAt),
    );
    if (!shift) {
      return;
    }

    const liquid = new Liquid();
    const subjectTemplate = liquid.parse(schedule.textEmailSubjectTemplate);
    const bodyTemplate = liquid.parse(schedule.textEmailBodyTemplate);
    const parsedFrom = parsePhoneNumberFromString(payload.from);
    const from = parsedFrom
      ? formatPhoneNumberForDisplay(parsedFrom, defaultCountryCode)
      : payload.from;

    await Promise.all(
      sortShiftAssignments(shift.shiftAssignments).map((responder, index) => {
        const templateVars: TextReceivedTemplateVariables = {
          from,
          body: payload.body,
          responderIndex: index,
          responder,
        };

        return mailTransport.sendMail({
          from: schedule.emailFrom,
          to: responder.email,
          subject: liquid.renderSync(subjectTemplate, templateVars),
          text: liquid.renderSync(bodyTemplate, templateVars),
        });
      }),
    );
  },
});
