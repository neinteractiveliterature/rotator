import { useTranslation } from "react-i18next";
import type { Route } from "./+types/edit";
import { assertFound, coerceId } from "~/db/utils";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ResponderFormFields, {
  parseResponderFormData,
} from "~/components/forms/responder";
import { respondersTable } from "~/db/schema";
import { eq } from "drizzle-orm";
import { Form, redirect } from "react-router";

export async function action({ context, request, params }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    await context.db
      .update(respondersTable)
      .set(parseResponderFormData(formData))
      .where(eq(respondersTable.id, coerceId(params.responderId)));

    return redirect(`/responders/${params.responderId}`);
  } catch (error) {
    return error;
  }
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const responder = assertFound(
    await context.db.query.respondersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
    })
  );

  return { responder };
}

export default function ResponderEditPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { responder } = loaderData;
  const { t } = useTranslation();

  return (
    <>
      <title>{t("responders.editPage.title", { name: responder.name })}</title>

      <header className="mb-4">
        <h1>{t("responders.editPage.title", { name: responder.name })}</h1>
      </header>

      <section className="mb-2">
        <Form method="PATCH">
          <ResponderFormFields responder={responder} />

          <ErrorDisplay graphQLError={actionData} />

          <input
            type="submit"
            className="btn btn-primary"
            value={t("buttons.save")}
          />
        </Form>
      </section>
    </>
  );
}
