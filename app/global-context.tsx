import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from "libphonenumber-js";
import React from "react";
import type { AppLoadContext } from "react-router";

export type RotatorGlobalContextValue = {
  defaultCountryCode: AppLoadContext["defaultCountryCode"];
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
  defaultCountryCode: AppLoadContext["defaultCountryCode"];
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
