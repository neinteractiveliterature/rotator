import { assertFound, coerceId } from "~/db/utils";
import type { Route } from "./+types/edit";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import { ShiftFormFields } from "~/shifts/form";

export async function loader({ context, params }: Route.LoaderArgs) {
  const shift = assertFound(
    await context.db.query.shiftsTable.findFirst({
      where: (tbl, { eq, and }) =>
        and(
          eq(tbl.scheduleId, coerceId(params.scheduleId)),
          eq(tbl.id, coerceId(params.shiftId))
        ),
      with: {
        shiftAssignments: {
          with: {
            responder: true,
          },
        },
        schedule: {
          columns: { timeZone: true },
        },
      },
    })
  );
  const responders = await context.db.query.respondersTable.findMany();

  return { shift, responders };
}

export async function action({ request }: Route.ActionArgs) {}

export default function EditShift({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const { shift, responders } = loaderData;

  return (
    <>
      <header className="mb-4">
        <h1>{t("shifts.editPage.title")}</h1>
      </header>

      <Form method="PATCH">
        <ShiftFormFields shift={shift} responders={responders} />

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
