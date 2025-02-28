import parsePhoneNumberFromString from "libphonenumber-js";

export function normalizePhoneNumber(phoneNumber: string) {
  const parsed = parsePhoneNumberFromString(phoneNumber);
  if (!parsed) {
    return phoneNumber;
  }

  return parsed.format("E.164");
}
