import { useTranslation } from "react-i18next";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import type { Route } from "./+types/edit";
import { Form, redirect } from "react-router";
import { phoneNumbersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { assertFound, coerceId } from "~/db/utils";
import parsePhoneNumberFromString from "libphonenumber-js";
import i18n from "~/i18n";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import PhoneNumberFormFields from "~/phone-numbers/form";
import { use, useMemo } from "react";
import { RotatorGlobalContext } from "~/global-context";
import { dbContext, defaultCountryCodeContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const phoneNumber = assertFound(
    await db.query.phoneNumbersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.phoneNumberId)),
    })
  );

  return { phoneNumber };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const phoneNumber = formData.get("phoneNumber")?.toString() ?? "";
  const defaultCountryCode = context.get(defaultCountryCodeContext);
  const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountryCode);

  if (!parsed) {
    return new Error(
      i18n.t("phoneNumbers.errors.invalidPhoneNumber", { phoneNumber })
    );
  }

  const db = context.get(dbContext);
  await db
    .update(phoneNumbersTable)
    .set({
      noActiveShiftMessage: formData.get("noActiveShiftMessage")?.toString(),
      phoneNumber: parsed.format("E.164"),
    })
    .where(eq(phoneNumbersTable.id, coerceId(params.phoneNumberId)));

  return redirect(`/phone_numbers/${params.phoneNumberId}`);
}

export default function EditRouteForm({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const { phoneNumber } = loaderData;
  const { defaultCountryCode, parsePhoneNumber } = use(RotatorGlobalContext);

  const parsed = useMemo(
    () => parsePhoneNumber(phoneNumber.phoneNumber)!,
    [phoneNumber.phoneNumber, parsePhoneNumber]
  );

  return (
    <>
      <header className="mb-4">
        <h1>
          {t("phoneNumbers.editPage.title", {
            phoneNumber: formatPhoneNumberForDisplay(
              parsed,
              defaultCountryCode
            ),
          })}
        </h1>
      </header>

      <Form method="PATCH">
        <PhoneNumberFormFields phoneNumber={phoneNumber} />

        <ErrorDisplay graphQLError={actionData} />

        <input
          type="submit"
          className="btn btn-primary"
          value={t("buttons.save")}
        />
      </Form>
    </>
  );
}
