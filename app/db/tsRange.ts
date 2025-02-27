import { customType } from "drizzle-orm/pg-core";

export type TimestampRange = {
  start: Date;
  finish: Date;
  includeStart: boolean;
  includeFinish: boolean;
};

export const tsRange = customType<{
  data: TimestampRange;
  driverData: string;
  notNull: true;
  default: true;
}>({
  dataType() {
    return "tsrange";
  },
  fromDriver(value) {
    const match = value.match(/^([([])"([^"]*)","([^"]*)"([)\]])$/);
    if (!match) {
      throw new Error(`Could not parse tsrange value: ${value}`);
    }

    const [startSymbol, startTimestamp, finishTimestamp, finishSymbol] =
      match.slice(1);

    const startDate = new Date(startTimestamp + "+0000");
    const finishDate = new Date(finishTimestamp + "+0000");

    return {
      includeStart: startSymbol === "[",
      includeFinish: finishSymbol === "]",
      start: startDate,
      finish: finishDate,
    };
  },
  toDriver: (value) => {
    const startSymbol = value.includeStart ? "[" : ")";
    const finishSymbol = value.includeFinish ? "]" : ")";
    const start = value.start.toISOString();
    const finish = value.finish.toISOString();

    return `${startSymbol}"${start}","${finish}"${finishSymbol}`;
  },
});
