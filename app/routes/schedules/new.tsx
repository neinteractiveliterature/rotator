import { useTranslation } from "react-i18next";
import type { Route } from "./+types/new";
import { Form, redirect } from "react-router";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ScheduleFormFields, {
  parseScheduleFormData,
  type ScheduleFormFieldsProps,
} from "~/components/forms/schedule";
import { schedulesTable } from "~/db/schema";
import { dbContext } from "~/contexts";

const blankSchedule: ScheduleFormFieldsProps["schedule"] = {
  callTimeout: 10,
  emailFrom: "",
  name: "",
  noActiveShiftTextMessage: "",
  postCallTextTemplate: "",
  textEmailBodyTemplate: "",
  textEmailSubjectTemplate: "",
  textResponderTemplate: "",
  timeZone: "America/New_York",
  timespan: {
    start: new Date("1970-01-01T00:00:00Z"),
    finish: new Date("2100-01-01T00:00:00Z"),
    includeFinish: false,
    includeStart: true,
  },
  voicemailEmailBodyTemplate: "",
  voicemailEmailSubjectTemplate: "",
  voicemailMessage: "",
  voicemailSilenceTimeout: 10,
  voicemailTextTemplate: "",
  welcomeMessage: "",
};

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.get(dbContext);
  try {
    const formData = await request.formData();

    const schedule = (
      await db
        .insert(schedulesTable)
        .values({
          ...blankSchedule,
          ...parseScheduleFormData(formData),
        })
        .returning()
    )[0];

    return redirect(`/schedules/${schedule.id}`);
  } catch (error) {
    return error;
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
        <ScheduleFormFields schedule={blankSchedule} />

        <ErrorDisplay graphQLError={actionData} />

        <input
          type="submit"
          className="btn btn-primary"
          value={t("buttons.save")}
        />
      </Form>
    </>
  );
}
