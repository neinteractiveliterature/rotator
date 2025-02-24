import type { AppLoadContext } from "react-router";
import type { Route } from "./+types/incoming";
import { z } from "zod";
import {
  phoneNumbersSchedulesTable,
  phoneNumbersTable,
  schedulesTable,
  shiftsTable,
} from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { twimlSayResponse } from "~/twimlUtils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import i18n from "~/i18n";

const voiceParams = z.object({
  Called: z.string(),
});

function normalizePhoneNumber(phoneNumber: string) {
  const parsed = parsePhoneNumberFromString(phoneNumber);
  if (!parsed) {
    return phoneNumber;
  }

  return parsed.format("E.164");
}

async function activeShiftsForPhoneNumber(
  context: AppLoadContext,
  phoneNumber: string,
  at: Date
) {
  return await context.db
    .select()
    .from(shiftsTable)
    .innerJoin(schedulesTable, eq(shiftsTable.scheduleId, schedulesTable.id))
    .innerJoin(
      phoneNumbersSchedulesTable,
      eq(phoneNumbersSchedulesTable.scheduleId, schedulesTable.id)
    )
    .innerJoin(
      phoneNumbersTable,
      eq(phoneNumbersTable.id, phoneNumbersSchedulesTable.phoneNumberId)
    )
    .where(
      and(
        sql`timespan @> ${at}::timestamp`,
        eq(phoneNumbersTable.phoneNumber, phoneNumber)
      )
    );
}

export async function action({ context, request }: Route.ActionArgs) {
  const params = voiceParams.parse(
    await context.validateTwilioWebhook(request)
  );

  const calledNumber = normalizePhoneNumber(params.Called);

  const shifts = await activeShiftsForPhoneNumber(
    context,
    calledNumber,
    new Date()
  );

  if (shifts.length == 0) {
    const phoneNumber = await context.db.query.phoneNumbersTable.findFirst({
      where: (phoneNumbers, { eq }) =>
        eq(phoneNumbers.phoneNumber, params.Called),
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

  return twimlSayResponse(`Thanks for calling ${params.Called}`);
}
