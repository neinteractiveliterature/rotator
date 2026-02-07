import { useTranslation } from "react-i18next";
import HighlightedText from "~/components/highlighted-text";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";
import { useSchedule } from "~/routes/schedules/$scheduleId";

export type NoActiveShiftTextData = Pick<
  ReturnType<typeof useSchedule>,
  "noActiveShiftTextMessage"
>;

export type NoActiveShiftTextProps = {
  save: (data: NoActiveShiftTextData) => Promise<unknown>;
};

export default function NoActiveShiftText({ save }: NoActiveShiftTextProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<NoActiveShiftTextData>
      iconName="person-x"
      title={t("schedules.textFlow.ifNoActiveShift")}
      data={schedule}
      save={save}
      prepareEditingData={(data) => ({
        noActiveShiftTextMessage: data.noActiveShiftTextMessage,
      })}
      finishEditingData={(data) => data}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow
            label={t("schedules.noActiveShiftTextMessage.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.noActiveShiftTextMessage}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    noActiveShiftTextMessage: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.noActiveShiftTextMessage} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
