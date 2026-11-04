import { useTranslation } from "react-i18next";
import type { Route } from "./+types/new";
import { Form, redirect } from "react-router";
import ScheduleFormFields, {
  parseScheduleFormData,
  type ScheduleFormFieldsProps,
} from "~/components/forms/schedule";
import type { schedulesTable } from "~/db/schema";
import { createSchedule } from "~/.server/repositories/schedules.server";
import { type InferInsertModel } from "drizzle-orm";
import type { TimestampRange } from "~/db/tsRange";
import { ErrorDisplay, serializeError } from "~/components/error-display";
import i18n from "~/i18n";

function buildBlankTimespan(): TimestampRange {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const finish = new Date(start);
  finish.setUTCDate(finish.getUTCDate() + 3);

  return { start, finish, includeFinish: false, includeStart: true };
}

const buildBlankSchedule = (): InferInsertModel<typeof schedulesTable> => ({
  callTimeout: 10,
  emailFrom: "",
  name: "",
  noActiveShiftTextMessage: "",
  postCallTextTemplate: "",
  textEmailBodyTemplate: "",
  textEmailSubjectTemplate: "",
  textResponderTemplate: "",
  timeZone: "America/New_York",
  timespan: buildBlankTimespan(),
  voicemailEmailBodyTemplate: "",
  voicemailEmailSubjectTemplate: "",
  voicemailMessage: "",
  voicemailSilenceTimeout: 10,
  voicemailTextTemplate: "",
  welcomeMessage: "",
});

const buildBlankFormFields = (): ScheduleFormFieldsProps["schedule"] => {
  const blankSchedule = buildBlankSchedule();
  return {
    emailFrom: blankSchedule.emailFrom,
    name: blankSchedule.name,
    timespan: buildBlankTimespan(),
    timeZone: blankSchedule.timeZone,
  };
};

export async function action({ context, request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const values = {
      ...buildBlankSchedule(),
      ...Object.fromEntries(
        Object.entries(parseScheduleFormData(formData)).filter(
          ([, value]) => typeof value !== "undefined",
        ),
      ),
    };

    const schedule = await createSchedule(context, values);

    return redirect(`/schedules/${schedule.id}`);
  } catch (error) {
    return serializeError(error, i18n.t);
  }
}

export default function NewSchedule({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className="mb-4">
        <h1>{t("schedules.newPage.title")}</h1>
      </header>

      <Form method="POST">
        <ScheduleFormFields schedule={buildBlankFormFields()} />

        <ErrorDisplay error={actionData} />

        <input
          type="submit"
          className="btn btn-primary"
          value={t("buttons.save")}
        />
      </Form>
    </>
  );
}
