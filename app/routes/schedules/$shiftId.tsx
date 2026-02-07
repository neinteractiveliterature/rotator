import { SerializedShift } from "~/components/shift-scheduling";
import type { Route } from "./+types/$shiftId";
import { dbContext } from "~/contexts";
import { shiftAssignmentsTable, shiftsTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { TimestampRange } from "~/db/tsRange";
import { serializeError } from "~/components/error-display";
import i18n from "~/i18n";

export async function action({ params, context, request }: Route.ActionArgs) {
  const db = context.get(dbContext);
  const shiftId = Number.parseInt(params.shiftId);

  if (request.method === "PATCH") {
    const data = SerializedShift.parse(await request.json());

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(shiftsTable)
          .set({
            timespan: {
              start: new Date(data.timespan.start),
              finish: new Date(data.timespan.finish),
              includeStart: true,
              includeFinish: false,
            } satisfies TimestampRange,
          })
          .where(eq(shiftsTable.id, shiftId));

        await tx
          .delete(shiftAssignmentsTable)
          .where(eq(shiftAssignmentsTable.shiftId, shiftId));

        await tx.insert(shiftAssignmentsTable).values(
          data.shiftAssignments.map((shiftAssignment, index) => ({
            position: index + 1,
            responderId: shiftAssignment.responderId,
            shiftId,
          })),
        );
      });
    } catch (err) {
      return serializeError(err, i18n.t);
    }
  } else if (request.method === "DELETE") {
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(shiftAssignmentsTable)
          .where(eq(shiftAssignmentsTable.shiftId, shiftId));
        await tx.delete(shiftsTable).where(eq(shiftsTable.id, shiftId));
      });
    } catch (err) {
      return serializeError(err, i18n.t);
    }
  } else {
    return new Response(null, { status: 404 });
  }
}
