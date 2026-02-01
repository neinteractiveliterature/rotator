import { useTranslation } from "react-i18next";
import HighlightedText from "~/components/highlighted-text";
import { EditableWorkflowStep } from "~/components/workflow-step";
import { LiquidInputControlIfHydrated } from "~/LiquidInput";
import { useSchedule } from "~/routes/schedules/$scheduleId";

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
        <ul className="list-group list-group-flush">
          <li className="list-group-item">
            <div className="row">
              <div className="col-3">
                {t("schedules.voicemailMessage.label")}
              </div>
              <div className="col-9">
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
              </div>
            </div>
          </li>
          <li className="list-group-item">
            <div className="row">
              <div className="col-3">
                {t("schedules.voicemailSilenceTimeout.label")}
              </div>
              <div className="col-9">
                {editingData ? (
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={editingData.voicemailSilenceTimeout}
                      onChange={(event) =>
                        setEditingData((prevEditingData) => ({
                          ...prevEditingData,
                          voicemailSilenceTimeout: event.target.value,
                        }))
                      }
                    />
                    <span className="input-group-text">
                      {t("units.seconds")}
                    </span>
                  </div>
                ) : (
                  t("schedules.voicemailSilenceTimeout.value", {
                    count: data.voicemailSilenceTimeout,
                  })
                )}
              </div>
            </div>
          </li>
        </ul>
      )}
    </EditableWorkflowStep>
  );
}
