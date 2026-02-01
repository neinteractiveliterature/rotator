import type { BootstrapIconProps } from "./bootstrap-icon";
import BootstrapIcon from "./bootstrap-icon";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export type WorkflowStepProps = {
  iconName: BootstrapIconProps["name"];
  title: React.ReactNode;
  children?: React.ReactNode;
  controls?: React.ReactNode;
};

export function WorkflowStep({
  iconName,
  title,
  children,
  controls,
}: WorkflowStepProps) {
  return (
    <div className="card m-0">
      <div className={children ? "card-header" : "card-body"}>
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <BootstrapIcon name={iconName} /> {title}
          </div>
          {controls}
        </div>
      </div>
      {children}
    </div>
  );
}

export type EditableWorkflowStepProps<Data, EditingData = Data> = Omit<
  WorkflowStepProps,
  "children" | "controls"
> & {
  data: Data;
  save: (data: Data) => Promise<unknown>;
  prepareEditingData: (data: Data) => EditingData;
  finishEditingData: (editingData: EditingData) => Data;
  children: ({
    data,
    editingData,
    setEditingData,
  }: {
    data: Data;
    editingData: EditingData | undefined;
    setEditingData: React.Dispatch<React.SetStateAction<EditingData>>;
  }) => React.ReactNode;
};

function isFunctionalSetStateAction<T>(
  action: React.SetStateAction<T>,
): action is (prevState: T) => T {
  return typeof action === "function";
}

export function EditableWorkflowStep<Data, EditingData = Data>({
  iconName,
  title,
  data,
  save,
  prepareEditingData,
  finishEditingData,
  children,
}: EditableWorkflowStepProps<Data, EditingData>) {
  const { t } = useTranslation();
  const [editingData, setEditingData] = useState<EditingData>();

  return (
    <WorkflowStep
      title={title}
      iconName={iconName}
      controls={
        editingData ? (
          <div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setEditingData(undefined)}
            >
              <BootstrapIcon name="x" /> {t("buttons.cancel")}
            </button>{" "}
            <button
              className="btn btn-sm btn-primary"
              onClick={async () => {
                await save(finishEditingData(editingData));
                setEditingData(undefined);
              }}
            >
              <BootstrapIcon name="check" /> {t("buttons.save")}
            </button>
          </div>
        ) : (
          <div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setEditingData(prepareEditingData(data))}
            >
              <BootstrapIcon name="pencil-fill" /> {t("buttons.edit")}
            </button>
          </div>
        )
      }
    >
      {children({
        data,
        editingData,
        setEditingData: (setStateAction) => {
          if (isFunctionalSetStateAction(setStateAction)) {
            if (editingData) {
              return setStateAction(editingData);
            } else {
              return editingData;
            }
          } else {
            return setStateAction;
          }
        },
      })}
    </WorkflowStep>
  );
}
