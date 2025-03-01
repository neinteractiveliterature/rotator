import type { InferSelectModel } from "drizzle-orm";
import { useTranslation } from "react-i18next";
import type { respondersTable, schedulesTable, shiftsTable } from "~/db/schema";
import { TimespanInput } from "~/TimespanInput";
import Select from "react-select";
import { useHydrated } from "~/useHydrated";
import { FormGroupWithLabel } from "@neinteractiveliterature/litform";

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
  const hydrated = useHydrated();

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

      {hydrated && (
        <FormGroupWithLabel label={t("shifts.timespan.respondersLabel")}>
          {(id) => (
            <Select
              id={id}
              name="responders"
              options={responders}
              formatOptionLabel={(option) => option.name}
              isMulti
              getOptionValue={(option) => option.id.toString()}
              defaultValue={shift.shiftAssignments.map(
                (assignment) => assignment.responder
              )}
            />
          )}
        </FormGroupWithLabel>
      )}
    </>
  );
}
