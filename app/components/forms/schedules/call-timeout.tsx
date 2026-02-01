import { useTranslation } from "react-i18next";
import type { BootstrapIconProps } from "~/components/bootstrap-icon";
import { EditableWorkflowStep } from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";

export type CallTimeoutData = Pick<
  ReturnType<typeof useSchedule>,
  "callTimeout"
>;

export type CallTimeoutFormProps = {
  title: React.ReactNode;
  iconName: BootstrapIconProps["name"];
  save: (data: CallTimeoutData) => Promise<unknown>;
};

export function CallTimeoutForm({
  title,
  iconName,
  save,
}: CallTimeoutFormProps) {
  const schedule = useSchedule();
  const { t } = useTranslation();

  return (
    <EditableWorkflowStep<CallTimeoutData, { callTimeout: string }>
      title={title}
      iconName={iconName}
      save={save}
      data={schedule}
      prepareEditingData={(data) => ({
        callTimeout: data.callTimeout.toString(),
      })}
      finishEditingData={(editingData) => ({
        callTimeout: Number.parseInt(editingData.callTimeout),
      })}
    >
      {({ data, editingData, setEditingData }) => (
        <ul className="list-group list-group-flush">
          <li className="list-group-item">
            <div className="row">
              <div className="col-3">{t("schedules.callTimeout.label")}</div>
              <div className="col-9">
                {editingData ? (
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={editingData.callTimeout}
                      onChange={(event) =>
                        setEditingData((prevEditingData) => ({
                          ...prevEditingData,
                          callTimeout: event.target.value,
                        }))
                      }
                    />
                    <span className="input-group-text">
                      {t("units.seconds")}
                    </span>
                  </div>
                ) : (
                  t("schedules.callTimeout.value", {
                    count: data.callTimeout,
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
