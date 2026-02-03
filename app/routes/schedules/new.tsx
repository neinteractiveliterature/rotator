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
import { DrizzleQueryError, type InferInsertModel } from "drizzle-orm";
import type { TimestampRange } from "~/db/tsRange";

const blankTimespan: TimestampRange = {
  start: new Date("1970-01-01T00:00:00Z"),
  finish: new Date("2100-01-01T00:00:00Z"),
  includeFinish: false,
  includeStart: true,
};

const blankSchedule: InferInsertModel<typeof schedulesTable> = {
  callTimeout: 10,
  emailFrom: "",
  name: "",
  noActiveShiftTextMessage: "",
  postCallTextTemplate: "",
  textEmailBodyTemplate: "",
  textEmailSubjectTemplate: "",
  textResponderTemplate: "",
  timeZone: "America/New_York",
  timespan: blankTimespan,
  voicemailEmailBodyTemplate: "",
  voicemailEmailSubjectTemplate: "",
  voicemailMessage: "",
  voicemailSilenceTimeout: 10,
  voicemailTextTemplate: "",
  welcomeMessage: "",
};

const blankFormFields: ScheduleFormFieldsProps["schedule"] = {
  emailFrom: blankSchedule.emailFrom,
  name: blankSchedule.name,
  timespan: blankTimespan,
  timeZone: blankSchedule.timeZone,
};

export async function action({ context, request }: Route.ActionArgs) {
  const db = context.get(dbContext);
  try {
    const formData = await request.formData();
    const values = {
      ...blankSchedule,
      ...Object.fromEntries(
        Object.entries(parseScheduleFormData(formData)).filter(
          ([, value]) => typeof value !== "undefined",
        ),
      ),
    };

    const schedule = (
      await db.insert(schedulesTable).values(values).returning()
    )[0];

    return redirect(`/schedules/${schedule.id}`);
  } catch (error) {
    if (error instanceof DrizzleQueryError && error.cause) {
      return error.cause;
    } else {
      return error;
    }
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
        <ScheduleFormFields schedule={blankFormFields} />

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
