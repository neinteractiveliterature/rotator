import { useTranslation } from "react-i18next";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import HighlightedText from "~/components/highlighted-text";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";

export type PostVoicemailEmailData = Pick<
  ReturnType<typeof useSchedule>,
  "voicemailEmailSubjectTemplate" | "voicemailEmailBodyTemplate"
>;

export type PostVoicemailEmailFormProps = {
  save: (data: PostVoicemailEmailData) => Promise<unknown>;
};

export function PostVoicemailEmailForm({ save }: PostVoicemailEmailFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<PostVoicemailEmailData>
      title={t("schedules.phoneFlow.voicemailReceivedEmail")}
      iconName="envelope-fill"
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        voicemailEmailSubjectTemplate: data.voicemailEmailSubjectTemplate,
        voicemailEmailBodyTemplate: data.voicemailEmailBodyTemplate,
      })}
      finishEditingData={(editingData) => editingData}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow
            label={t("schedules.voicemailEmailSubjectTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.voicemailEmailSubjectTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    voicemailEmailSubjectTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.voicemailEmailSubjectTemplate} />
            )}
          </WorkflowStepFormRow>
          <WorkflowStepFormRow
            label={t("schedules.voicemailEmailBodyTemplate.label")}
          >
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.voicemailEmailBodyTemplate}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    voicemailEmailBodyTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.voicemailEmailBodyTemplate} />
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
