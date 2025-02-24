import type { Route } from "./+types/phone-number";
import { BootstrapFormTextarea } from "@neinteractiveliterature/litform";

export async function loader({ context, params }: Route.LoaderArgs) {
  const phoneNumber = await context.db.query.phoneNumbersTable.findFirst({
    where: (tbl, { eq }) =>
      eq(tbl.id, Number.parseInt(params.phoneNumberId, 10)),
  });

  if (!phoneNumber) {
    throw new Response("Not found", { status: 404 });
  }

  return { phoneNumber };
}

export default function PhoneNumberPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1>{loaderData.phoneNumber.phoneNumber}</h1>

      <BootstrapFormTextarea
        label="No active shift message"
        value={loaderData.phoneNumber.noActiveShiftMessage ?? ""}
        onTextChange={() => {}}
        readOnly
        helpText="This message will be spoken when the number is called but no schedule is currently active."
      />
    </>
  );
}
