import { BootstrapFormInput } from "@neinteractiveliterature/litform";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Temporal, toTemporalInstant } from "temporal-polyfill";
import type { schedulesTable } from "~/db/schema";
import { LiquidInput } from "~/LiquidInput";

export function parseScheduleFormData(
  formData: FormData
): InferInsertModel<typeof schedulesTable> {
  const timeZone = formData.get("timeZone")?.toString() ?? "";

  return {
    name: formData.get("name")?.toString() ?? "",
    emailFrom: formData.get("emailFrom")?.toString() ?? "",
    timeZone,
    timespan: {
      start: new Date(
        Temporal.PlainDateTime.from(
          formData.get("timespan.start")?.toString() ?? ""
        ).toZonedDateTime(timeZone).epochMilliseconds
      ),
      finish: new Date(
        Temporal.PlainDateTime.from(
          formData.get("timespan.finish")?.toString() ?? ""
        ).toZonedDateTime(timeZone).epochMilliseconds
      ),
      includeStart: true,
      includeFinish: false,
    },
    callTimeout: parseInt(formData.get("callTimeout")?.toString() ?? ""),
    noActiveShiftTextMessage:
      formData.get("noActiveShiftTextMessage")?.toString() ?? "",
    postCallTextTemplate:
      formData.get("postCallTextTemplate")?.toString() ?? "",
    textEmailBodyTemplate:
      formData.get("textEmailBodyTemplate")?.toString() ?? "",
    textEmailSubjectTemplate:
      formData.get("textEmailSubjectTemplate")?.toString() ?? "",
    textResponderTemplate:
      formData.get("textResponderTemplate")?.toString() ?? "",
    voicemailEmailBodyTemplate:
      formData.get("voicemailEmailBodyTemplate")?.toString() ?? "",
    voicemailEmailSubjectTemplate:
      formData.get("voicemailEmailSubjectTemplate")?.toString() ?? "",
    voicemailMessage: formData.get("voicemailMessage")?.toString() ?? "",
    voicemailSilenceTimeout: parseInt(
      formData.get("voicemailSilenceTimeout")?.toString() ?? ""
    ),
    voicemailTextTemplate:
      formData.get("voicemailTextTemlate")?.toString() ?? "",
    welcomeMessage: formData.get("welcomeMessage")?.toString() ?? "",
  };
}

export type ScheduleFormFieldsProps = {
  schedule: Pick<
    InferSelectModel<typeof schedulesTable>,
    | "emailFrom"
    | "name"
    | "timespan"
    | "welcomeMessage"
    | "postCallTextTemplate"
    | "callTimeout"
    | "voicemailMessage"
    | "voicemailSilenceTimeout"
    | "voicemailEmailBodyTemplate"
    | "voicemailEmailSubjectTemplate"
    | "voicemailTextTemplate"
    | "noActiveShiftTextMessage"
    | "textEmailBodyTemplate"
    | "textEmailSubjectTemplate"
    | "textResponderTemplate"
    | "timeZone"
  >;
};

export default function ScheduleFormFields({
  schedule,
}: ScheduleFormFieldsProps) {
  const { t } = useTranslation();

  const [postCallTextTemplate, setPostCallTextTemplate] = useState(
    schedule.postCallTextTemplate
  );
  const [voicemailMessage, setVoicemailMessage] = useState(
    schedule.voicemailMessage
  );
  const [voicemailEmailSubjectTemplate, setVoicemailEmailSubjectTemplate] =
    useState(schedule.voicemailEmailSubjectTemplate);
  const [voicemailEmailBodyTemplate, setVoicemailEmailBodyTemplate] = useState(
    schedule.voicemailEmailBodyTemplate
  );
  const [voicemailTextTemplate, setVoicemailTextTemplate] = useState(
    schedule.voicemailTextTemplate
  );
  const [noActiveShiftTextMessage, setNoActiveShiftTextMessage] = useState(
    schedule.noActiveShiftTextMessage
  );
  const [textEmailSubjectTemplate, setTextEmailSubjectTemplate] = useState(
    schedule.textEmailSubjectTemplate
  );
  const [textEmailBodyTemplate, setTextEmailBodyTemplate] = useState(
    schedule.textEmailBodyTemplate
  );
  const [textResponderTemplate, setTextResponderTemplate] = useState(
    schedule.textResponderTemplate
  );

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

      <BootstrapFormInput
        label={t("schedules.timeZone.label")}
        name="timeZone"
        defaultValue={schedule.timeZone}
      />

      <div className="d-flex">
        <div className="col-md-6 me-2">
          <BootstrapFormInput
            label={t("schedules.timespan.startLabel")}
            name="timespan.start"
            type="datetime-local"
            defaultValue={toTemporalInstant
              .apply(schedule.timespan.start)
              .toZonedDateTime({
                timeZone: schedule.timeZone,
                calendar: "iso8601",
              })
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
              .toZonedDateTime({
                timeZone: schedule.timeZone,
                calendar: "iso8601",
              })
              .toPlainDateTime()
              .toString()}
          />
        </div>
      </div>

      <BootstrapFormInput
        label={t("schedules.welcomeMessage.label")}
        name="welcomeMessage"
        defaultValue={schedule.welcomeMessage}
      />

      <LiquidInput
        name="postCallTextTemplate"
        label={t("schedules.postCallTextTemplate.label")}
        value={postCallTextTemplate}
        onChange={setPostCallTextTemplate}
      />

      <BootstrapFormInput
        label={t("schedules.callTimeout.label")}
        name="callTimeout"
        defaultValue={schedule.callTimeout}
      />

      <LiquidInput
        name="voicemailMessage"
        label={t("schedules.voicemailMessage.label")}
        value={voicemailMessage}
        onChange={setVoicemailMessage}
      />

      <BootstrapFormInput
        label={t("schedules.voicemailSilenceTimeout.label")}
        name="voicemailSilenceTimeout"
        defaultValue={schedule.voicemailSilenceTimeout}
      />

      <div className="card bg-light mb-3">
        <div className="card-header">
          {t("schedules.voicemailNotification.title")}
        </div>
        <div className="card-body">
          <LiquidInput
            name="voicemailEmailSubjectTemplate"
            label={t("schedules.voicemailEmailSubjectTemplate.label")}
            value={voicemailEmailSubjectTemplate}
            onChange={setVoicemailEmailSubjectTemplate}
          />

          <LiquidInput
            name="voicemailEmailBodyTemplate"
            label={t("schedules.voicemailEmailBodyTemplate.label")}
            value={voicemailEmailBodyTemplate}
            onChange={setVoicemailEmailBodyTemplate}
          />

          <LiquidInput
            name="voicemailTextTemplate"
            label={t("schedules.voicemailTextTemplate.label")}
            value={voicemailTextTemplate}
            onChange={setVoicemailTextTemplate}
          />
        </div>
      </div>

      <LiquidInput
        name="noActiveShiftTextMessage"
        label={t("schedules.noActiveShiftTextMessage.label")}
        value={noActiveShiftTextMessage}
        onChange={setNoActiveShiftTextMessage}
      />

      <div className="card bg-light mb-3">
        <div className="card-header">
          {t("schedules.textReceivedNotification.title")}
        </div>
        <div className="card-body">
          <LiquidInput
            name="textEmailSubjectTemplate"
            label={t("schedules.textEmailSubjectTemplate.label")}
            value={textEmailSubjectTemplate}
            onChange={setTextEmailSubjectTemplate}
          />

          <LiquidInput
            name="textEmailBodyTemplate"
            label={t("schedules.textEmailBodyTemplate.label")}
            value={textEmailBodyTemplate}
            onChange={setTextEmailBodyTemplate}
          />

          <LiquidInput
            name="textResponderTemplate"
            label={t("schedules.textResponderTemplate.label")}
            value={textResponderTemplate}
            onChange={setTextResponderTemplate}
          />
        </div>
      </div>
    </>
  );
}
