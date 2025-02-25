import { useTranslation } from "react-i18next";
import {
  BootstrapFormInput,
  BootstrapFormTextarea,
  ErrorDisplay,
} from "@neinteractiveliterature/litform";
import type { Route } from "./+types/edit";
import { Form, redirect } from "react-router";
import { findPhoneNumber } from "./utils";
import { phoneNumbersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { coerceId } from "~/db/utils";
import parsePhoneNumberFromString from "libphonenumber-js";
import i18n from "~/i18n";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";

export async function loader({ context, params }: Route.LoaderArgs) {
  const phoneNumber = await findPhoneNumber(context.db, params.phoneNumberId);
  return { phoneNumber, defaultCountryCode: context.defaultCountryCode };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const phoneNumber = formData.get("phoneNumber")?.toString() ?? "";
  const parsed = parsePhoneNumberFromString(
    phoneNumber,
    context.defaultCountryCode
  );

  if (!parsed) {
    return new Error(
      i18n.t("phoneNumbers.errors.invalidPhoneNumber", { phoneNumber })
    );
  }

  await context.db
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
  const { defaultCountryCode, phoneNumber } = loaderData;

  const parsed = parsePhoneNumberFromString(
    phoneNumber.phoneNumber,
    loaderData.defaultCountryCode
  )!;

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
        <BootstrapFormInput
          label={t("phoneNumbers.phoneNumber.label")}
          name="phoneNumber"
          defaultValue={formatPhoneNumberForDisplay(parsed, defaultCountryCode)}
        />

        <BootstrapFormTextarea
          label={t("phoneNumbers.noActiveShiftMessage.label")}
          name="noActiveShiftMessage"
          defaultValue={phoneNumber.noActiveShiftMessage ?? ""}
          helpText={t("phoneNumbers.noActiveShiftMessage.helpText")}
        />

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
