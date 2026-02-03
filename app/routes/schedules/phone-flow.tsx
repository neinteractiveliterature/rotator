import { useTranslation } from "react-i18next";
import { useSchedule } from "./$scheduleId";
import FlowList from "~/components/flow-arrows";
import { CallTimeoutForm } from "~/components/forms/schedules/call-timeout";
import { WorkflowStep } from "~/components/workflow-step";
import { useFetcher, type SubmitTarget } from "react-router";
import WelcomeMessage from "~/components/forms/schedules/welcome-message";
import PostCallTextMessage from "~/components/forms/schedules/post-call-text-message";
import { VoicemailForm } from "~/components/forms/schedules/voicemail";
import { PostVoicemailTextForm } from "~/components/forms/schedules/post-voicemail-text";
import { PostVoicemailEmailForm } from "~/components/forms/schedules/post-voicemail-email";
import BootstrapIcon from "~/components/bootstrap-icon";

export default function PhoneFlow() {
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
        {t("schedules.phoneFlow.title")} - {schedule.name}
      </title>

      <header className="mb-4">
        <h1>{t("schedules.phoneFlow.title")}</h1>
      </header>

      <div style={{ display: "grid" }}>
        <FlowList
          items={[
            {
              content: (
                <WorkflowStep
                  iconName="telephone-inbound"
                  title={t("schedules.phoneFlow.voiceCall")}
                />
              ),
              branches: [
                {
                  items: [
                    {
                      content: (
                        <WorkflowStep
                          iconName="person-check-fill"
                          title={t("schedules.phoneFlow.ifActiveShift")}
                        />
                      ),
                    },
                    { content: <WelcomeMessage save={save} /> },
                    {
                      content: (
                        <CallTimeoutForm
                          iconName="telephone-outbound-fill"
                          title={t("schedules.phoneFlow.callPrimaryResponder")}
                          save={save}
                        />
                      ),
                      branches: [
                        {
                          items: [
                            {
                              content: (
                                <WorkflowStep
                                  title={t(
                                    "schedules.phoneFlow.ifCallAnsweredConnectCall",
                                  )}
                                  iconName="telephone-forward-fill"
                                />
                              ),
                            },
                            { content: <PostCallTextMessage save={save} /> },
                          ],
                        },
                        {
                          items: [
                            {
                              content: (
                                <WorkflowStep
                                  title={t(
                                    "schedules.phoneFlow.ifCallNotAnsweredCheckForMoreResponders",
                                  )}
                                  iconName="people"
                                />
                              ),
                              branches: [
                                {
                                  items: [
                                    {
                                      content: (
                                        <CallTimeoutForm
                                          title={t(
                                            "schedules.phoneFlow.ifMoreRespondersCallNextResponder",
                                          )}
                                          iconName="telephone-forward-fill"
                                          save={save}
                                        />
                                      ),
                                    },
                                  ],
                                },
                                {
                                  items: [
                                    { content: <VoicemailForm save={save} /> },
                                    {
                                      content: (
                                        <PostVoicemailTextForm save={save} />
                                      ),
                                    },
                                    {
                                      content: (
                                        <PostVoicemailEmailForm save={save} />
                                      ),
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  items: [
                    {
                      content: (
                        <WorkflowStep
                          iconName="person-x"
                          title={t("schedules.phoneFlow.ifNoActiveShift")}
                        />
                      ),
                    },
                    {
                      content: (
                        <WorkflowStep
                          iconName="voicemail"
                          title={t("schedules.phoneFlow.voicemail")}
                        >
                          <div className="card-body">
                            <BootstrapIcon name="arrow-up-right-circle" />{" "}
                            {t("schedules.phoneFlow.seeVoicemailSettings")}
                          </div>
                        </WorkflowStep>
                      ),
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
