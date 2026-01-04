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
import { validateTwilioWebhook } from "~/server/validateTwilioWebhook.server";
import { dbContext, twilioClientContext } from "~/contexts";

export type PostCallTextTemplateVariables = {
  from: string;
};

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  const twilioClient = context.get(twilioClientContext);
  const webhookParams = TwilioDialResponseParams.parse(
    await validateTwilioWebhook(request)
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
      await db.query.respondersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
      })
    );

    const liquid = new Liquid();

    twilioClient.messages.create({
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
