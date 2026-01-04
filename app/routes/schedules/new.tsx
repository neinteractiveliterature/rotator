import { useTranslation } from "react-i18next";
import type { Route } from "./+types/edit";
import { Form, redirect } from "react-router";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ScheduleFormFields, {
  parseScheduleFormData,
  type ScheduleFormFieldsProps,
} from "~/schedules/form";
import { schedulesTable } from "~/db/schema";
import { dbContext } from "~/contexts";

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  try {
    const formData = await request.formData();

    await db.insert(schedulesTable).values(parseScheduleFormData(formData));

    return redirect(`/schedules/${params.scheduleId}`);
  } catch (error) {
    return error;
  }
}

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
