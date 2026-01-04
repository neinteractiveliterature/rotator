import type { Route } from "./+types/incoming";
import { twimlSayResponse } from "./twimlUtils";
import i18n from "~/i18n";
import { callActiveShiftResponse, voicemailResponse } from "./webhookResponses";
import { VoiceWebhookParams } from "./twimlWebhookParams";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  bestResponderForShift,
} from "./schedules";
import { normalizePhoneNumber } from "./normalizePhoneNumber";
import { validateTwilioWebhook } from "~/server/validateTwilioWebhook.server";
import { dbContext } from "~/contexts";

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.get(dbContext);
  const params = VoiceWebhookParams.parse(await validateTwilioWebhook(request));

  const calledNumber = normalizePhoneNumber(params.To);
  const now = new Date();

  const schedules = await activeSchedulesForPhoneNumber(
    context,
    calledNumber,
    now
  );

  if (schedules.length == 0) {
    const phoneNumber = await db.query.phoneNumbersTable.findFirst({
      where: (phoneNumbers, { eq }) => eq(phoneNumbers.phoneNumber, params.To),
    });

    if (phoneNumber) {
      return twimlSayResponse(
        phoneNumber.noActiveShiftMessage ??
          i18n.t("voiceResponses.defaultNoActiveShiftMessage")
      );
    } else {
      return twimlSayResponse(
        i18n.t("voiceResponses.unknownPhoneNumber", {
          phoneNumber: calledNumber.split("").join(" "),
        })
      );
    }
  }

  const activeSchedule = schedules[0];
  const activeShift = await activeShiftForSchedule(
    context,
    activeSchedule.schedules.id,
    now
  );

  if (activeShift) {
    const responder = bestResponderForShift(activeShift);

    if (responder) {
      return callActiveShiftResponse({
        sayText: activeSchedule.schedules.welcomeMessage,
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
