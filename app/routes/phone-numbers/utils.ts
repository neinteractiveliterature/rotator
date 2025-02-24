import type { AppLoadContext } from "react-router";
import { assertFound, coerceId } from "~/db/utils";

export async function findPhoneNumber(
  db: AppLoadContext["db"],
  phoneNumber: string | number
) {
  return assertFound(
    await db.query.phoneNumbersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(phoneNumber)),
    })
  );
}
