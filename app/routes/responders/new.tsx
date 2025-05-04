import { useTranslation } from "react-i18next";
import type { Route } from "./+types/new";
import { ErrorDisplay } from "@neinteractiveliterature/litform";
import ResponderFormFields, {
  parseResponderFormData,
  type ResponderFormFieldsProps,
} from "~/components/forms/responder";
import { respondersTable } from "~/db/schema";
import { Form, redirect } from "react-router";

export async function action({ context, request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    const responder = (
      await context.db
        .insert(respondersTable)
        .values(parseResponderFormData(formData))
        .returning()
    )[0];

    return redirect(`/responders/${responder.id}`);
  } catch (error) {
    return error;
  }
}

const blankResponder: ResponderFormFieldsProps["responder"] = {
  email: "",
  name: "",
  phoneNumber: "",
};

export default function NewResponderPage({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation();

  return (
    <>
      <title>{t("responders.newPage.title")}</title>

      <header className="mb-4">
        <h1>{t("responders.newPage.title")}</h1>
      </header>

      <section className="mb-2">
        <Form method="POST">
          <ResponderFormFields responder={blankResponder} />

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
