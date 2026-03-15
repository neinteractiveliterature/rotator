import { use } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";
import { and, eq } from "drizzle-orm";
import parsePhoneNumberFromString from "libphonenumber-js";
import { dbContext } from "~/contexts";
import { phoneNumbersSchedulesTable } from "~/db/schema";
import { coerceId } from "~/db/utils";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import { RotatorGlobalContext } from "~/global-context";
import type { Route } from "./+types/phone-numbers";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const scheduleId = coerceId(params.scheduleId);

  const [allPhoneNumbers, schedulePhoneNumbers] = await Promise.all([
    db.query.phoneNumbersTable.findMany(),
    db.query.phoneNumbersSchedulesTable.findMany({
      where: (tbl, { eq }) => eq(tbl.scheduleId, scheduleId),
      with: { phoneNumber: true },
    }),
  ]);

  return { allPhoneNumbers, schedulePhoneNumbers };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  const formData = await request.formData();
  const scheduleId = coerceId(params.scheduleId);
  const phoneNumberId = coerceId(
    formData.get("phoneNumberId")?.toString() ?? ""
  );

  if (request.method === "POST") {
    await db
      .insert(phoneNumbersSchedulesTable)
      .values({ phoneNumberId, scheduleId })
      .onConflictDoNothing();
  } else if (request.method === "DELETE") {
    await db
      .delete(phoneNumbersSchedulesTable)
      .where(
        and(
          eq(phoneNumbersSchedulesTable.scheduleId, scheduleId),
          eq(phoneNumbersSchedulesTable.phoneNumberId, phoneNumberId)
        )
      );
  }

  return null;
}

export default function SchedulePhoneNumbers({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const { defaultCountryCode, parsePhoneNumber } = use(RotatorGlobalContext);
  const { allPhoneNumbers, schedulePhoneNumbers } = loaderData;

  const associatedIds = new Set(
    schedulePhoneNumbers.map((sp) => sp.phoneNumberId)
  );
  const unassociatedPhoneNumbers = allPhoneNumbers.filter(
    (pn) => !associatedIds.has(pn.id)
  );

  return (
    <>
      <h2>{t("schedules.phoneNumbers.title")}</h2>

      <ul className="list-group mb-4">
        {schedulePhoneNumbers.map(({ phoneNumber }) => {
          const parsed = parsePhoneNumberFromString(
            phoneNumber.phoneNumber,
            defaultCountryCode
          );
          return (
            <li
              key={phoneNumber.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {parsed
                ? formatPhoneNumberForDisplay(parsed, defaultCountryCode)
                : phoneNumber.phoneNumber}
              <Form method="DELETE">
                <input
                  type="hidden"
                  name="phoneNumberId"
                  value={phoneNumber.id}
                />
                <button type="submit" className="btn btn-sm btn-danger">
                  {t("schedules.phoneNumbers.disassociate")}
                </button>
              </Form>
            </li>
          );
        })}
        {schedulePhoneNumbers.length === 0 && (
          <li className="list-group-item text-muted">
            {t("schedules.phoneNumbers.none")}
          </li>
        )}
      </ul>

      {unassociatedPhoneNumbers.length > 0 && (
        <Form method="POST" className="d-flex gap-2 align-items-end">
          <div>
            <label className="form-label">
              {t("schedules.phoneNumbers.addLabel")}
            </label>
            <select name="phoneNumberId" className="form-select">
              {unassociatedPhoneNumbers.map((pn) => {
                const parsed = parsePhoneNumber(pn.phoneNumber);
                return (
                  <option key={pn.id} value={pn.id}>
                    {parsed
                      ? formatPhoneNumberForDisplay(parsed, defaultCountryCode)
                      : pn.phoneNumber}
                  </option>
                );
              })}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("schedules.phoneNumbers.associate")}
          </button>
        </Form>
      )}
    </>
  );
}
