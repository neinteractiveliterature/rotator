import { Liquid } from "liquidjs";
import { defineJob } from "./defineJob";

export type PostCallTextTemplateVariables = {
  from: string;
};

export type SendPostCallTextPayload = {
  scheduleId: number;
  responderId: number;
  /** The caller's number */
  from: string;
  /** The schedule's number the caller dialed: the text comes from it */
  to: string;
};

/** Texts a responder who just finished a call, so they can follow up */
export const sendPostCallTextJob = defineJob<SendPostCallTextPayload>({
  name: "sendPostCallText",
  async handler(payload, { db, twilioClient }) {
    const [schedule, responder] = await Promise.all([
      db.query.schedulesTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.scheduleId),
      }),
      db.query.respondersTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, payload.responderId),
      }),
    ]);
    if (!schedule || !responder) {
      return;
    }

    await twilioClient.messages.create({
      from: payload.to,
      to: responder.phoneNumber,
      body: new Liquid().parseAndRenderSync(schedule.postCallTextTemplate, {
        from: payload.from,
      } satisfies PostCallTextTemplateVariables),
    });
  },
});
