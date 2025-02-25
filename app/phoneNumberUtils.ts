import type { CountryCode, PhoneNumber } from "libphonenumber-js";

export function formatPhoneNumberForDisplay(
  phoneNumber: PhoneNumber,
  defaultCountryCode: CountryCode
) {
  if (phoneNumber.country === defaultCountryCode) {
    return phoneNumber.formatNational();
  } else {
    return phoneNumber.formatInternational();
  }
}
