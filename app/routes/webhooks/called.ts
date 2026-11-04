import { callActiveShiftResponse, voicemailResponse } from "./webhookResponses";
import type { Route } from "./+types/called";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  bestResponderForShift,
} from "~/.server/repositories/onCall.server";
import { TwilioDialResponseParams } from "./twimlWebhookParams";
import { assertFound, coerceId } from "~/db/utils";
import {
  sendPostCallTextJob,
  type PostCallTextTemplateVariables,
} from "~/.server/jobs/sendPostCallText";
import { twimlHangupResponse } from "./twimlUtils";
import { validateTwilioWebhook } from "~/.server/validateTwilioWebhook.server";
import { readDbContext } from "~/contexts";

export type { PostCallTextTemplateVariables };

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(readDbContext);
  const webhookParams = TwilioDialResponseParams.parse(
    await validateTwilioWebhook(request)
  );

  const now = new Date();
  const schedules = await activeSchedulesForPhoneNumber(
    db,
    webhookParams.To,
    now
  );

  if (schedules.length == 0) {
    // TODO
    throw new Error("Figure out wtf to do about this");
  }

  const activeSchedule = schedules[0];

  if (webhookParams.DialCallStatus === "completed") {
    const responder = assertFound(
      await db.query.respondersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
      }),
    );

    // Texted in the background so that a Twilio retry of this webhook can't send it twice
    await sendPostCallTextJob.perform({
      scheduleId: activeSchedule.schedules.id,
      responderId: responder.id,
      from: webhookParams.From,
      to: webhookParams.To,
    });

    return twimlHangupResponse();
  } else {
    const activeShift = await activeShiftForSchedule(
      db,
      activeSchedule.schedules.id,
      now
    );

    if (activeShift) {
      const responder = bestResponderForShift(
        activeShift,
        coerceId(params.responderId)
      );
      if (responder) {
        return callActiveShiftResponse({
          callerId: activeSchedule.phone_numbers.phoneNumber,
          schedule: activeSchedule.schedules,
          responder,
        });
      }
    }

    return voicemailResponse({
      schedule: activeSchedule.schedules,
    });
  }
}
