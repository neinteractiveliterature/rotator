import { useTranslation } from "react-i18next";
import { useSchedule } from "./$scheduleId";
import FlowList from "~/components/flow-arrows";
import { WorkflowStep } from "~/components/workflow-step";
import { useFetcher, type SubmitTarget } from "react-router";
import NoActiveShiftText from "~/components/forms/schedules/no-active-shift-text";
import { OutboundTextForm } from "~/components/forms/schedules/outbound-text";
import { OutboundEmailForm } from "~/components/forms/schedules/outbound-email";

export default function TextFlow() {
  const schedule = useSchedule();
  const { t } = useTranslation();
  const fetcher = useFetcher();

  const save = (data: SubmitTarget) =>
    fetcher.submit(data, {
      method: "PATCH",
      action: `/schedules/${schedule.id}`,
    });

  return (
    <>
      <title>
        {t("schedules.textFlow.title")} - {schedule.name}
      </title>

      <header className="mb-4">
        <h1>{t("schedules.textFlow.title")}</h1>
      </header>

      <div style={{ display: "grid" }}>
        <FlowList
          items={[
            {
              content: (
                <WorkflowStep
                  iconName="chat-left-text"
                  title={t("schedules.textFlow.textMessage")}
                />
              ),
              branches: [
                {
                  items: [
                    {
                      content: (
                        <WorkflowStep
                          iconName="person-check-fill"
                          title={t("schedules.textFlow.ifActiveShift")}
                        />
                      ),
                    },
                    { content: <OutboundTextForm save={save} /> },
                    { content: <OutboundEmailForm save={save} /> },
                  ],
                },
                {
                  items: [
                    {
                      content: <NoActiveShiftText save={save} />,
                    },
                  ],
                },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
