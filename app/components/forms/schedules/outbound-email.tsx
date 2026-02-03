import { useTranslation } from "react-i18next";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import HighlightedText from "~/components/highlighted-text";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";

export type OutboundEmailData = Pick<
  ReturnType<typeof useSchedule>,
  "textEmailSubjectTemplate" | "textEmailBodyTemplate"
>;

export type OutboundEmailFormProps = {
  save: (data: OutboundEmailData) => Promise<unknown>;
};

export function OutboundEmailForm({ save }: OutboundEmailFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<OutboundEmailData>
      title={t("schedules.textFlow.outboundEmail")}
      iconName="envelope-fill"
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        textEmailSubjectTemplate: data.textEmailSubjectTemplate,
        textEmailBodyTemplate: data.textEmailBodyTemplate,
      })}
      finishEditingData={(editingData) => editingData}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow
            label={t("schedules.textEmailSubjectTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.textEmailSubjectTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    textEmailSubjectTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.textEmailSubjectTemplate} />
            )}
          </WorkflowStepFormRow>
          <WorkflowStepFormRow
            label={t("schedules.textEmailBodyTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.textEmailBodyTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    textEmailBodyTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.textEmailBodyTemplate} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
