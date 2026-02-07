import { useTranslation } from "react-i18next";
import HighlightedText from "~/components/highlighted-text";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";
import { useSchedule } from "~/routes/schedules/$scheduleId";

export type PostCallTextMessageData = Pick<
  ReturnType<typeof useSchedule>,
  "postCallTextTemplate"
>;

export type PostCallTextMessageProps = {
  save: (data: PostCallTextMessageData) => Promise<unknown>;
};

export default function PostCallTextMessage({
  save,
}: PostCallTextMessageProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<PostCallTextMessageData>
      iconName="chat-right-text-fill"
      title={t("schedules.phoneFlow.postCallText")}
      data={schedule}
      save={save}
      prepareEditingData={(data) => ({
        postCallTextTemplate: data.postCallTextTemplate,
      })}
      finishEditingData={(data) => data}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow
            label={t("schedules.postCallTextTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.postCallTextTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    postCallTextTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.postCallTextTemplate} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
