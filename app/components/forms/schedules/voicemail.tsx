import { useTranslation } from "react-i18next";
import HighlightedText from "~/components/highlighted-text";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import { SecondsInput } from "../seconds-input";

export type VoicemailData = Pick<
  ReturnType<typeof useSchedule>,
  "voicemailSilenceTimeout" | "voicemailMessage"
>;

export type VoicemailFormProps = {
  save: (data: VoicemailData) => Promise<unknown>;
};

export function VoicemailForm({ save }: VoicemailFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<
      VoicemailData,
      { voicemailSilenceTimeout: string; voicemailMessage: string }
    >
      title={t("schedules.phoneFlow.ifNoMoreRespondersRecordVoicemail")}
      iconName="voicemail"
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        voicemailSilenceTimeout: data.voicemailSilenceTimeout.toString(),
        voicemailMessage: data.voicemailMessage,
      })}
      finishEditingData={(editingData) => ({
        voicemailSilenceTimeout: Number.parseInt(
          editingData.voicemailSilenceTimeout,
        ),
        voicemailMessage: editingData.voicemailMessage,
      })}
    >
      {({ data, editingData, setEditingData }) => (
        <WorkflowStepFormBody>
          <WorkflowStepFormRow label={t("schedules.voicemailMessage.label")}>
            {editingData ? (
              <LiquidInputControlIfHydrated
                value={editingData.voicemailMessage}
                onChange={(value) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    postCallTextTemplate: value,
                  }))
                }
              />
            ) : (
              <HighlightedText text={data.voicemailMessage} />
            )}
          </WorkflowStepFormRow>
          <WorkflowStepFormRow
            label={t("schedules.voicemailSilenceTimeout.label")}
          >
            {editingData ? (
              <SecondsInput
                value={editingData.voicemailSilenceTimeout}
                onChange={(event) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    voicemailSilenceTimeout: event.target.value,
                  }))
                }
              />
            ) : (
              t("schedules.voicemailSilenceTimeout.value", {
                count: data.voicemailSilenceTimeout,
              })
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
