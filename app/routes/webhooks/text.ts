import { type InferSelectModel } from "drizzle-orm";
import type { Route } from "./+types/text";
import { normalizePhoneNumber } from "./normalizePhoneNumber";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  sortShiftAssignments,
} from "./schedules";
import { MessagingWebhookParams } from "./twimlWebhookParams";
import type { respondersTable } from "~/db/schema";
import { twimlMessageResponse } from "./twimlUtils";
import i18n from "~/i18n";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Liquid } from "liquidjs";

export type TextReceivedTemplateVariables = {
  from: string;
  body: string;
  responderIndex: number;
  responder: InferSelectModel<typeof respondersTable>;
};

export async function action({ context, request }: Route.ActionArgs) {
  const params = MessagingWebhookParams.parse(
    await context.validateTwilioWebhook(request)
  );

  const textedNumber = normalizePhoneNumber(params.To);
  const now = new Date();

  const schedules = await activeSchedulesForPhoneNumber(
    context,
    textedNumber,
    now
  );

  if (schedules.length == 0) {
    const phoneNumber = await context.db.query.phoneNumbersTable.findFirst({
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
            parsePhoneNumberFromString(
              textedNumber,
              context.defaultCountryCode
            )!,
            context.defaultCountryCode
          ),
        }),
      });
    }
  }

  const activeSchedule = schedules[0];
  const activeShift = await activeShiftForSchedule(
    context,
    activeSchedule.schedules.id,
    now
  );

  const liquid = new Liquid();

  const parsedFromNumber = parsePhoneNumberFromString(params.From)!;
  const fromNumberForDisplay = formatPhoneNumberForDisplay(
    parsedFromNumber,
    context.defaultCountryCode
  );

  if (activeShift) {
    const sortedResponders = sortShiftAssignments(activeShift.shiftAssignments);

    const emailSubjectTemplate = liquid.parse(
      activeSchedule.schedules.textEmailSubjectTemplate
    );
    const emailBodyTemplate = liquid.parse(
      activeSchedule.schedules.textEmailBodyTemplate
    );

    const mailPromises = sortedResponders.map((responder, index) => {
      const templateVars: TextReceivedTemplateVariables = {
        from: fromNumberForDisplay,
        body: params.Body,
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

    await Promise.all(mailPromises);

    return twimlMessageResponse({
      fromPhoneNumber: activeSchedule.phone_numbers.phoneNumber,
      toPhoneNumber: sortedResponders[0].email,
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
