import type { InferSelectModel } from "drizzle-orm";
import { twimlCallResponse, twimlVoicemailResponse } from "./twimlUtils";
import type { respondersTable, schedulesTable } from "~/db/schema";

export function callActiveShiftResponse({
  sayText,
  callerId,
  schedule,
  responder,
}: {
  sayText?: string;
  callerId: string;
  schedule: Pick<InferSelectModel<typeof schedulesTable>, "callTimeout">;
  responder: Pick<
    InferSelectModel<typeof respondersTable>,
    "id" | "phoneNumber"
  >;
}) {
  return twimlCallResponse({
    sayText,
    phoneNumber: responder.phoneNumber,
    attributes: {
      callerId,
      timeout: schedule.callTimeout,
      action: new URL(
        `/called/${responder.id}`,
        process.env.APP_URL_BASE
      ).toString(),
      method: "POST",
    },
  });
}

export function voicemailResponse({
  schedule,
}: {
  schedule: Pick<
    InferSelectModel<typeof schedulesTable>,
    "voicemailMessage" | "voicemailSilenceTimeout"
  >;
}) {
  return twimlVoicemailResponse({
    sayText: schedule.voicemailMessage,
    attributes: {
      timeout: schedule.voicemailSilenceTimeout,
      action: new URL(`/voicemail`, process.env.APP_URL_BASE).toString(),
    },
  });
}
