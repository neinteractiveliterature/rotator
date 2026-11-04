import { useTranslation } from "react-i18next";
import type { Route } from "./+types/edit";
import { assertFound, coerceId } from "~/db/utils";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ResponderFormFields, {
  parseResponderFormData,
} from "~/components/forms/responder";
import { updateResponder } from "~/.server/repositories/responders.server";
import { Form, redirect } from "react-router";
import { readDbContext } from "~/contexts";

export async function action({ context, request, params }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    await updateResponder(
      context,
      coerceId(params.responderId),
      parseResponderFormData(formData),
    );

    return redirect(`/responders/${params.responderId}`);
  } catch (error) {
    return error;
  }
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = context.get(readDbContext);
  const responder = assertFound(
    await db.query.respondersTable.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, coerceId(params.responderId)),
    }),
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
