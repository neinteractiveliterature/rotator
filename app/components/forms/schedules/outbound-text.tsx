import { useTranslation } from "react-i18next";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import HighlightedText from "~/components/highlighted-text";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";

export type OutboundTextData = Pick<
  ReturnType<typeof useSchedule>,
  "textResponderTemplate"
>;

export type OutboundTextFormProps = {
  save: (data: OutboundTextData) => Promise<unknown>;
};

export function OutboundTextForm({ save }: OutboundTextFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<OutboundTextData>
      title={t("schedules.textFlow.outboundText")}
      iconName="chat-right-fill"
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        textResponderTemplate: data.textResponderTemplate,
      })}
      finishEditingData={(editingData) => editingData}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow
            label={t("schedules.voicemailTextTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.textResponderTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    textResponderTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.textResponderTemplate} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
