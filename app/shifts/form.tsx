import type { InferSelectModel } from "drizzle-orm";
import { useTranslation } from "react-i18next";
import type { respondersTable, schedulesTable, shiftsTable } from "~/db/schema";
import { TimespanInput } from "~/TimespanInput";
import Downshift from "downshift";

export type ShiftFormFieldsProps = {
  shift: Pick<InferSelectModel<typeof shiftsTable>, "timespan"> & {
    shiftAssignments: {
      responder: Pick<InferSelectModel<typeof respondersTable>, "id" | "name">;
    }[];
    schedule: Pick<InferSelectModel<typeof schedulesTable>, "timeZone">;
  };
  responders: Pick<InferSelectModel<typeof respondersTable>, "id" | "name">[];
};

export function ShiftFormFields({ shift, responders }: ShiftFormFieldsProps) {
  const { t } = useTranslation();
  // const hydrated = useHydrated();

  return (
    <>
      <TimespanInput
        defaultValue={shift.timespan}
        startLabel={t("shifts.timespan.startLabel")}
        startName="timespan.start"
        finishLabel={t("shifts.timespan.finishLabel")}
        finishName="timespan.finish"
        timeZone={shift.schedule.timeZone}
      />

      <Downshift>{() => <div></div>}</Downshift>
    </>
  );
}
