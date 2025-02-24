import { useTranslation } from "react-i18next";
import {
  BootstrapFormInput,
  BootstrapFormTextarea,
} from "@neinteractiveliterature/litform";
import type { Route } from "./+types/edit";
import { Form, redirect } from "react-router";
import { findPhoneNumber } from "./utils";
import { phoneNumbersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { coerceId } from "~/db/utils";

export async function loader({ context, params }: Route.LoaderArgs) {
  const phoneNumber = await findPhoneNumber(context.db, params.phoneNumberId);
  return { phoneNumber };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  await context.db
    .update(phoneNumbersTable)
    .set({
      noActiveShiftMessage: formData.get("noActiveShiftMessage")?.toString(),
      phoneNumber: formData.get("phoneNumber")?.toString(),
    })
    .where(eq(phoneNumbersTable.id, coerceId(params.phoneNumberId)));

  return redirect(`/phone_numbers/${params.phoneNumberId}`);
}

export default function EditRouteForm({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <h1>
        {t("phoneNumbers.editPage.title", {
          phoneNumber: loaderData.phoneNumber.phoneNumber,
        })}
      </h1>

      <Form method="PATCH">
        <BootstrapFormInput
          label={t("phoneNumbers.phoneNumber.label")}
          name="phoneNumber"
          value={loaderData.phoneNumber.phoneNumber}
          onTextChange={() => {}}
        />

        <BootstrapFormTextarea
          label={t("phoneNumbers.noActiveShiftMessage.label")}
          name="noActiveShiftMessage"
          value={loaderData.phoneNumber.noActiveShiftMessage ?? ""}
          onTextChange={() => {}}
          readOnly
          helpText={t("phoneNumbers.noActiveShiftMessage.helpText")}
        />

        <input
          type="submit"
          className="btn btn-primary"
          value={t("buttons.save")}
        />
      </Form>
    </>
  );
}
