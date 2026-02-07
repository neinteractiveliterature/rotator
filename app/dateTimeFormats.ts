export const long: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  dayPeriod: "narrow",
};

export const short: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
};

export const ampmDateTime: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: true,
};

export const ampmTime: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "numeric",
  hour12: true,
};

const dateTimeFormats = { long, short, ampmTime, ampmDateTime };
export default dateTimeFormats;
