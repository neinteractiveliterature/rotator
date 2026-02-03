import { useTranslation } from "react-i18next";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import HighlightedText from "~/components/highlighted-text";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";

export type PostVoicemailTextData = Pick<
  ReturnType<typeof useSchedule>,
  "voicemailTextTemplate"
>;

export type PostVoicemailTextFormProps = {
  save: (data: PostVoicemailTextData) => Promise<unknown>;
};

export function PostVoicemailTextForm({ save }: PostVoicemailTextFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<PostVoicemailTextData>
      title={t("schedules.phoneFlow.voicemailReceivedText")}
      iconName="chat-right-fill"
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        voicemailTextTemplate: data.voicemailTextTemplate,
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
                value={editingData.voicemailTextTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    voicemailTextTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.voicemailTextTemplate} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
