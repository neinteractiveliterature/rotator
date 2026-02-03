import {
  BootstrapFormInput,
  BootstrapFormSelect,
} from "@neinteractiveliterature/litform";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { useTranslation } from "react-i18next";
import { Temporal, toTemporalInstant } from "temporal-polyfill";
import type { schedulesTable } from "~/db/schema";
import { getTimeZones } from "@vvo/tzdb";

const zones = getTimeZones({ includeUtc: true });

function formatOffset(offsetMinutes: number) {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes < 0 ? "-" : "+";
  return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function parseIntOrUndefined(input: string | undefined) {
  if (input == null) {
    return undefined;
  }

  const parsed = Number.parseInt(input);
  if (Number.isNaN(parsed)) {
    return undefined;
  } else {
    return parsed;
  }
}

function parseDateTime(input: string, timeZone: string) {
  return new Date(
    Temporal.PlainDateTime.from(input).toZonedDateTime(timeZone)
      .epochMilliseconds,
  );
}

function parseTimespanOrUndefined(
  start: string | undefined,
  finish: string | undefined,
  timeZone: string,
) {
  if (start == null || finish == null) {
    return undefined;
  }

  return {
    start: parseDateTime(start, timeZone),
    finish: parseDateTime(finish, timeZone),
    includeStart: true,
    includeFinish: false,
  };
}

export function parseScheduleFormData(
  formData: FormData,
): Partial<InferInsertModel<typeof schedulesTable>> {
  return {
    name: formData.get("name")?.toString(),
    emailFrom: formData.get("emailFrom")?.toString(),
    timeZone: formData.get("timeZone")?.toString(),
    timespan: parseTimespanOrUndefined(
      formData.get("timespan.start")?.toString(),
      formData.get("timespan.finish")?.toString(),
      formData.get("timeZone")?.toString() ?? "",
    ),
    callTimeout: parseIntOrUndefined(formData.get("callTimeout")?.toString()),
    noActiveShiftTextMessage: formData
      .get("noActiveShiftTextMessage")
      ?.toString(),
    postCallTextTemplate: formData.get("postCallTextTemplate")?.toString(),
    textEmailBodyTemplate: formData.get("textEmailBodyTemplate")?.toString(),
    textEmailSubjectTemplate: formData
      .get("textEmailSubjectTemplate")
      ?.toString(),
    textResponderTemplate: formData.get("textResponderTemplate")?.toString(),
    voicemailEmailBodyTemplate: formData
      .get("voicemailEmailBodyTemplate")
      ?.toString(),
    voicemailEmailSubjectTemplate: formData
      .get("voicemailEmailSubjectTemplate")
      ?.toString(),
    voicemailMessage: formData.get("voicemailMessage")?.toString(),
    voicemailSilenceTimeout: parseIntOrUndefined(
      formData.get("voicemailSilenceTimeout")?.toString(),
    ),
    voicemailTextTemplate: formData.get("voicemailTextTemplate")?.toString(),
    welcomeMessage: formData.get("welcomeMessage")?.toString(),
  };
}

export type ScheduleFormFieldsProps = {
  schedule: Pick<
    InferSelectModel<typeof schedulesTable>,
    "emailFrom" | "name" | "timespan" | "timeZone"
  >;
};

export default function ScheduleFormFields({
  schedule,
}: ScheduleFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <BootstrapFormInput
        label={t("schedules.name.label")}
        name="name"
        defaultValue={schedule.name}
      />

      <BootstrapFormInput
        label={t("schedules.emailFrom.label")}
        name="emailFrom"
        defaultValue={schedule.emailFrom}
      />

      <BootstrapFormSelect
        label={t("schedules.timeZone.label")}
        name="timeZone"
        defaultValue={schedule.timeZone}
      >
        <option />
        {zones.map((zone) => (
          <option key={zone.name} value={zone.name}>
            [{formatOffset(zone.currentTimeOffsetInMinutes)}] {zone.name} (
            {zone.abbreviation})
          </option>
        ))}
      </BootstrapFormSelect>

      <div className="d-flex">
        <div className="col-md-6 me-2">
          <BootstrapFormInput
            label={t("schedules.timespan.startLabel")}
            name="timespan.start"
            type="datetime-local"
            defaultValue={toTemporalInstant
              .apply(schedule.timespan.start)
              .toZonedDateTimeISO(schedule.timeZone || "Etc/UTC")
              .withCalendar("iso8601")
              .toPlainDateTime()
              .toString()}
          />
        </div>
        <div className="col-md-6">
          <BootstrapFormInput
            label={t("schedules.timespan.finishLabel")}
            name="timespan.finish"
            type="datetime-local"
            defaultValue={toTemporalInstant
              .apply(schedule.timespan.finish)
              .toZonedDateTimeISO(schedule.timeZone || "Etc/UTC")
              .withCalendar("iso8601")
              .toPlainDateTime()
              .toString()}
          />
        </div>
      </div>
    </>
  );
}
