import { callActiveShiftResponse, voicemailResponse } from "./webhookResponses";
import type { Route } from "./+types/called";
import {
  activeSchedulesForPhoneNumber,
  activeShiftForSchedule,
  bestResponderForShift,
} from "./schedules";
import { TwilioDialResponseParams } from "./twimlWebhookParams";
import { assertFound, coerceId } from "~/db/utils";
import { Liquid } from "liquidjs";
import { twimlHangupResponse } from "./twimlUtils";

export type PostCallTextTemplateVariables = {
  from: string;
};

export async function action({ context, request, params }: Route.ActionArgs) {
  const webhookParams = TwilioDialResponseParams.parse(
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

  if (webhookParams.DialCallStatus === "completed") {
    const responder = assertFound(
      await context.db.query.respondersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
      })
    );

    const liquid = new Liquid();

    context.twilioClient.messages.create({
      from: webhookParams.To,
      to: responder.phoneNumber,
      body: liquid.parseAndRenderSync(
        activeSchedule.schedules.postCallTextTemplate,
        {
          from: webhookParams.From,
        } satisfies PostCallTextTemplateVariables
      ),
    });

    return twimlHangupResponse();
  } else {
    const activeShift = await activeShiftForSchedule(
      context,
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
