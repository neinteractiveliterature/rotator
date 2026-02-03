import { useTranslation } from "react-i18next";
import HighlightedText from "~/components/highlighted-text";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";
import { useSchedule } from "~/routes/schedules/$scheduleId";

export type WelcomeMessageData = Pick<
  ReturnType<typeof useSchedule>,
  "welcomeMessage"
>;

export type WelcomeMessageProps = {
  save: (data: WelcomeMessageData) => Promise<unknown>;
};

export default function WelcomeMessage({ save }: WelcomeMessageProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<WelcomeMessageData>
      iconName="chat-quote-fill"
      title={t("schedules.phoneFlow.welcomeMessage")}
      data={schedule}
      save={save}
      prepareEditingData={(data) => data}
      finishEditingData={(data) => data}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow label={t("schedules.welcomeMessage.label")}>
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.welcomeMessage}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    welcomeMessage: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.welcomeMessage} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
