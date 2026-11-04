import type { Route } from "./+types/text";
import { normalizePhoneNumber } from "./normalizePhoneNumber";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  sortShiftAssignments,
} from "~/.server/repositories/onCall.server";
import {
  notifyTextReceivedJob,
  type TextReceivedTemplateVariables,
} from "~/.server/jobs/notifyTextReceived";
import { MessagingWebhookParams } from "./twimlWebhookParams";
import { twimlMessageResponse } from "./twimlUtils";
import i18n from "~/i18n";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Liquid } from "liquidjs";
import { validateTwilioWebhook } from "~/.server/validateTwilioWebhook.server";
import { readDbContext, defaultCountryCodeContext } from "~/contexts";

export type { TextReceivedTemplateVariables };

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.get(readDbContext);
  const defaultCountryCode = context.get(defaultCountryCodeContext);

  const params = MessagingWebhookParams.parse(
    await validateTwilioWebhook(request)
  );

  const textedNumber = normalizePhoneNumber(params.To);
  const now = new Date();

  const schedules = await activeSchedulesForPhoneNumber(
    db,
    textedNumber,
    now
  );

  if (schedules.length == 0) {
    const phoneNumber = await db.query.phoneNumbersTable.findFirst({
      where: (phoneNumbers, { eq }) => eq(phoneNumbers.phoneNumber, params.To),
    });

    if (phoneNumber) {
      return twimlMessageResponse({
        toPhoneNumber: params.From,
        fromPhoneNumber: textedNumber,
        text:
          phoneNumber.noActiveShiftTextMessage ??
          i18n.t("textResponses.defaultNoActiveShiftMessage"),
      });
    } else {
      return twimlMessageResponse({
        toPhoneNumber: params.From,
        fromPhoneNumber: textedNumber,
        text: i18n.t("textResponses.unknownPhoneNumber", {
          phoneNumber: formatPhoneNumberForDisplay(
            parsePhoneNumberFromString(textedNumber, defaultCountryCode)!,
            defaultCountryCode
          ),
        }),
      });
    }
  }

  const activeSchedule = schedules[0];
  const activeShift = await activeShiftForSchedule(
    db,
    activeSchedule.schedules.id,
    now
  );

  const liquid = new Liquid();

  const parsedFromNumber = parsePhoneNumberFromString(params.From)!;
  const fromNumberForDisplay = formatPhoneNumberForDisplay(
    parsedFromNumber,
    defaultCountryCode
  );

  if (activeShift) {
    const sortedResponders = sortShiftAssignments(activeShift.shiftAssignments);

    // The emails go out in the background: Twilio retries a webhook that's slow to answer, and doing the sends inline
    // meant a retry sent them again.
    await notifyTextReceivedJob.perform({
      scheduleId: activeSchedule.schedules.id,
      from: params.From,
      body: params.Body,
      receivedAt: now.toISOString(),
    });

    return twimlMessageResponse({
      fromPhoneNumber: activeSchedule.phone_numbers.phoneNumber,
      toPhoneNumber: sortedResponders[0].phoneNumber,
      text: liquid.parseAndRenderSync(
        activeSchedule.schedules.textResponderTemplate,
        {
          body: params.Body,
          from: fromNumberForDisplay,
          responder: sortedResponders[0],
          responderIndex: 0,
        } satisfies TextReceivedTemplateVariables
      ),
    });
  } else {
    return twimlMessageResponse({
      text: liquid.parseAndRenderSync(
        activeSchedule.schedules.noActiveShiftTextMessage
      ),
      fromPhoneNumber: textedNumber,
      toPhoneNumber: params.From,
    });
  }
}
