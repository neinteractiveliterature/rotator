import { useTranslation } from "react-i18next";
import type { BootstrapIconProps } from "~/components/bootstrap-icon";
import {
  EditableWorkflowStep,
  WorkflowStepFormBody,
  WorkflowStepFormRow,
} from "~/components/workflow-step";
import { useSchedule } from "~/routes/schedules/$scheduleId";
import { SecondsInput } from "../seconds-input";

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
        <WorkflowStepFormBody>
          <WorkflowStepFormRow label={t("schedules.callTimeout.label")}>
            {editingData ? (
              <SecondsInput
                value={editingData.callTimeout}
                onChange={(event) =>
                  setEditingData((prevEditingData) => ({
                    ...prevEditingData,
                    callTimeout: event.target.value,
                  }))
                }
              />
            ) : (
              t("schedules.callTimeout.value", {
                count: data.callTimeout,
              })
            )}
          </WorkflowStepFormRow>
        </WorkflowStepFormBody>
      )}
    </EditableWorkflowStep>
  );
}
