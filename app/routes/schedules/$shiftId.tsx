import { SerializedShift } from "~/components/shift-scheduling";
import type { Route } from "./+types/$shiftId";
import {
  deleteShift,
  updateShift,
} from "~/.server/repositories/schedules.server";
import { coerceId } from "~/db/utils";
import { serializeError } from "~/components/error-display";
import i18n from "~/i18n";

export async function action({ params, context, request }: Route.ActionArgs) {
  const shiftId = coerceId(params.shiftId);

  if (request.method === "PATCH") {
    const data = SerializedShift.parse(await request.json());

    try {
      await updateShift(context, shiftId, {
        timespan: {
          start: new Date(data.timespan.start),
          finish: new Date(data.timespan.finish),
        },
        responderIds: data.shiftAssignments.map((sa) => sa.responderId),
      });
    } catch (err) {
      return serializeError(err, i18n.t);
    }
  } else if (request.method === "DELETE") {
    try {
      await deleteShift(context, shiftId);
    } catch (err) {
      return serializeError(err, i18n.t);
    }
  } else {
    return new Response(null, { status: 404 });
  }
}
