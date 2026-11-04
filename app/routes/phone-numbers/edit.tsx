import { useTranslation } from "react-i18next";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import type { Route } from "./+types/edit";
import { Form, redirect } from "react-router";
import { updatePhoneNumber } from "~/.server/repositories/phoneNumbers.server";
import { assertFound, coerceId } from "~/db/utils";
import parsePhoneNumberFromString from "libphonenumber-js";
import i18n from "~/i18n";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";
import PhoneNumberFormFields from "~/components/forms/phone-number";
import { use, useMemo } from "react";
import { RotatorGlobalContext } from "~/global-context";
import { readDbContext, defaultCountryCodeContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(readDbContext);
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

  await updatePhoneNumber(context, coerceId(params.phoneNumberId), {
    noActiveShiftMessage: formData.get("noActiveShiftMessage")?.toString(),
    phoneNumber: parsed.format("E.164"),
  });

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
