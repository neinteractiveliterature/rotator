import { useTranslation } from "react-i18next";
import type { Route } from "./+types/duplicate";
import { Form, redirect } from "react-router";
import ScheduleFormFields, {
  parseScheduleFormData,
} from "~/components/forms/schedule";
import { schedulesTable } from "~/db/schema";
import { dbContext } from "~/contexts";
import { assertFound, coerceId } from "~/db/utils";
import { ErrorDisplay, serializeError } from "~/components/error-display";
import i18n from "~/i18n";

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(dbContext);
  const schedule = assertFound(
    await db.query.schedulesTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
    }),
  );

  return { schedule };
}

export async function action({ context, request, params }: Route.ActionArgs) {
  const db = context.get(dbContext);
  try {
    const formData = await request.formData();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _unusedId, ...prevSchedule } = assertFound(
      await db.query.schedulesTable.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, coerceId(params.scheduleId)),
      }),
    );

    const values = {
      ...prevSchedule,
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
    return serializeError(error, i18n.t);
  }
}

export default function DuplicateSchedule({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const { schedule } = loaderData;

  return (
    <>
      <header className="mb-4">
        <h1>{t("schedules.duplicatePage.title")}</h1>
      </header>

      <Form method="POST">
        <ScheduleFormFields schedule={schedule} />

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
