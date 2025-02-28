import { BootstrapFormInput } from "@neinteractiveliterature/litform";
import type { TimestampRange } from "./db/tsRange";
import { Temporal, toTemporalInstant } from "temporal-polyfill";

export function parseTimespanInput({
  start,
  finish,
  timeZone,
}: {
  start: string;
  finish: string;
  timeZone: string;
}): TimestampRange {
  return {
    start: new Date(
      Temporal.PlainDateTime.from(start).toZonedDateTime(
        timeZone
      ).epochMilliseconds
    ),
    finish: new Date(
      Temporal.PlainDateTime.from(finish).toZonedDateTime(
        timeZone
      ).epochMilliseconds
    ),
    includeStart: true,
    includeFinish: false,
  };
}

export type TimespanInputProps = {
  startLabel: string;
  startName: string;
  finishLabel: string;
  finishName: string;
  defaultValue: TimestampRange;
  timeZone: string;
};

export function TimespanInput({
  startLabel,
  startName,
  finishLabel,
  finishName,
  defaultValue,
  timeZone,
}: TimespanInputProps) {
  return (
    <div className="d-flex">
      <div className="col-md-6 me-2">
        <BootstrapFormInput
          label={startLabel}
          name={startName}
          type="datetime-local"
          defaultValue={toTemporalInstant
            .apply(defaultValue.start)
            .toZonedDateTime({
              timeZone: timeZone,
              calendar: "iso8601",
            })
            .toPlainDateTime()
            .toString()}
        />
      </div>
      <div className="col-md-6">
        <BootstrapFormInput
          label={finishLabel}
          name={finishName}
          type="datetime-local"
          defaultValue={toTemporalInstant
            .apply(defaultValue.finish)
            .toZonedDateTime({
              timeZone: timeZone,
              calendar: "iso8601",
            })
            .toPlainDateTime()
            .toString()}
        />
      </div>
    </div>
  );
}
