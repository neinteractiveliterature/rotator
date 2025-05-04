import {
  BootstrapFormInput,
  BootstrapFormTextarea,
} from "@neinteractiveliterature/litform";
import type { InferSelectModel } from "drizzle-orm";
import { use, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { phoneNumbersTable } from "~/db/schema";
import { RotatorGlobalContext } from "~/global-context";
import { formatPhoneNumberForDisplay } from "~/phoneNumberUtils";

type PhoneNumberFormFieldsProps = {
  phoneNumber: Pick<
    InferSelectModel<typeof phoneNumbersTable>,
    "phoneNumber" | "noActiveShiftMessage"
  >;
};

export default function PhoneNumberFormFields({
  phoneNumber,
}: PhoneNumberFormFieldsProps) {
  const { t } = useTranslation();
  const { defaultCountryCode, parsePhoneNumber } = use(RotatorGlobalContext);
  const parsed = useMemo(
    () => parsePhoneNumber(phoneNumber.phoneNumber)!,
    [phoneNumber, parsePhoneNumber]
  );

  return (
    <>
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
    </>
  );
}
