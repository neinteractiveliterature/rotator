import { useTranslation } from "react-i18next";
import type { Route } from "./+types/edit";
import { assertFound, coerceId } from "~/db/utils";
import { Form, redirect } from "react-router";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ScheduleFormFields, { parseScheduleFormData } from "~/schedules/form";
import { schedulesTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { dbContext } from "~/contexts";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const schedule = assertFound(
    await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
    })
  );

  return { schedule };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  try {
    const formData = await request.formData();

    await db
      .update(schedulesTable)
      .set(parseScheduleFormData(formData))
      .where(eq(schedulesTable.id, coerceId(params.scheduleId)));

    return redirect(`/schedules/${params.scheduleId}`);
  } catch (error) {
    return error;
  }
}

export default function EditSchedule({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const { schedule } = loaderData;

  return (
    <>
      <header className="mb-4">
        <h1>{t("schedules.editPage.title", { name: schedule.name })}</h1>
      </header>

      <Form method="PATCH">
        <ScheduleFormFields schedule={schedule} />

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
