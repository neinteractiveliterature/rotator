import type { Route } from "./+types/incoming";
import { twimlSayResponse } from "./twimlUtils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import i18n from "~/i18n";
import { callActiveShiftResponse, voicemailResponse } from "./webhookResponses";
import { TwilioWebhookParams } from "./twimlWebhookParams";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  bestResponderForShift,
} from "./schedules";

function normalizePhoneNumber(phoneNumber: string) {
  const parsed = parsePhoneNumberFromString(phoneNumber);
  if (!parsed) {
    return phoneNumber;
  }

  return parsed.format("E.164");
}

export async function action({ context, request }: Route.ActionArgs) {
  const params = TwilioWebhookParams.parse(
    await context.validateTwilioWebhook(request)
  );

  const calledNumber = normalizePhoneNumber(params.To);
  const now = new Date();

  const schedules = await activeSchedulesForPhoneNumber(
    context,
    calledNumber,
    now
  );

  if (schedules.length == 0) {
    const phoneNumber = await context.db.query.phoneNumbersTable.findFirst({
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
    return callActiveShiftResponse({
      sayText: activeSchedule.schedules.welcomeMessage,
      callerId: activeSchedule.phone_numbers.phoneNumber,
      schedule: activeSchedule.schedules,
      responder: bestResponderForShift(activeShift),
    });
  } else {
    return voicemailResponse({
      schedule: activeSchedule.schedules,
    });
  }
}
