import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from "libphonenumber-js";
import React from "react";

export type RotatorGlobalContextValue = {
  defaultCountryCode: CountryCode;
  parsePhoneNumber: (
    phoneNumber: string,
    options?: Omit<
      Parameters<typeof parsePhoneNumberFromString>[1],
      "defaultCountry"
    >
  ) => PhoneNumber | undefined;
};

export function buildRotatorGlobalContextValue({
  defaultCountryCode,
}: {
  defaultCountryCode: CountryCode;
}): RotatorGlobalContextValue {
  return {
    defaultCountryCode,
    parsePhoneNumber: (phoneNumber, options) =>
      parsePhoneNumberFromString(phoneNumber, {
        ...options,
        defaultCountry: defaultCountryCode,
      }),
  };
}

export const RotatorGlobalContext =
  React.createContext<RotatorGlobalContextValue>(
    buildRotatorGlobalContextValue({ defaultCountryCode: "US" })
  );
