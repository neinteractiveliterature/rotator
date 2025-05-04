import { BootstrapFormInput } from "@neinteractiveliterature/litform";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { useTranslation } from "react-i18next";
import type { respondersTable } from "~/db/schema";

export function parseResponderFormData(
  formData: FormData
): InferInsertModel<typeof respondersTable> {
  return {
    email: formData.get("email")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    phoneNumber: formData.get("phoneNumber")?.toString() ?? "",
  };
}

export type ResponderFormFieldsProps = {
  responder: Pick<
    InferSelectModel<typeof respondersTable>,
    "email" | "name" | "phoneNumber"
  >;
};

export default function ResponderFormFields({
  responder,
}: ResponderFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <BootstrapFormInput
        label={t("responders.name.label")}
        name="name"
        defaultValue={responder.name}
      />

      <BootstrapFormInput
        label={t("responders.phoneNumber.label")}
        name="phoneNumber"
        defaultValue={responder.phoneNumber}
      />

      <BootstrapFormInput
        label={t("responders.email.label")}
        name="email"
        defaultValue={responder.email}
      />
    </>
  );
}
