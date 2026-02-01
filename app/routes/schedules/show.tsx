import { useTranslation } from "react-i18next";
import { Link, redirect } from "react-router";
import HighlightedText from "~/components/highlighted-text";
import { useSchedule } from "./$scheduleId";
import { Suspense, useMemo } from "react";
import { LoadingIndicator } from "@neinteractiveliterature/litform";
import LayoutFlow from "~/components/flowcharts/layout-flow";
import { buildGraph } from "~/components/flowcharts/build-graph";

// export async function loader() {
//   return redirect("./phone-flow");
// }

export default function SchedulePage() {
  const schedule = useSchedule();
  const { t } = useTranslation();

  const phoneFlow = useMemo(
    () =>
      buildGraph(
        t,
        "schedules.flowChart.",
        ({ labelWithIcon }) => [
          labelWithIcon({ id: "voiceCall", icon: "telephone-inbound" }),
          labelWithIcon({ id: "welcomeMessage", icon: "chat-quote-fill" }),
          labelWithIcon({
            id: "callPrimaryResponder",
            icon: "telephone-outbound-fill",
          }),
          labelWithIcon({ id: "connectCall", icon: "telephone-forward-fill" }),
          labelWithIcon({ id: "checkForMoreResponders", icon: "people" }),
          labelWithIcon({
            id: "callNextResponder",
            icon: "telephone-forward-fill",
          }),
          labelWithIcon({ id: "voicemail", icon: "voicemail" }),
          labelWithIcon({
            id: "voicemailReceivedText",
            icon: "chat-right-text-fill",
          }),
          labelWithIcon({
            id: "voicemailReceivedEmail",
            icon: "envelope-arrow-down-fill",
          }),
          labelWithIcon({
            id: "postCallText",
            icon: "chat-right-text-fill",
          }),
        ],
        ({ edge }) => [
          edge({ source: "voiceCall", target: "welcomeMessage" }),
          edge({ source: "welcomeMessage", target: "callPrimaryResponder" }),
          edge({
            source: "callPrimaryResponder",
            target: "connectCall",
            labelId: "ifCallAnswered",
          }),
          edge({
            source: "callPrimaryResponder",
            target: "checkForMoreResponders",
            labelId: "ifCallNotAnswered",
          }),
          edge({
            source: "checkForMoreResponders",
            target: "callNextResponder",
            labelId: "ifMoreResponders",
          }),
          edge({
            source: "callNextResponder",
            target: "connectCall",
            labelId: "ifCallAnswered",
          }),
          edge({
            source: "connectCall",
            target: "postCallText",
            labelId: "whenCallComplete",
          }),
          edge({
            source: "callNextResponder",
            target: "checkForMoreResponders",
            labelId: "ifCallNotAnswered",
          }),
          edge({
            source: "checkForMoreResponders",
            target: "voicemail",
            labelId: "ifNoMoreResponders",
          }),
          edge({ source: "voicemail", target: "voicemailReceivedText" }),
          edge({ source: "voicemail", target: "voicemailReceivedEmail" }),
        ],
      ),
    [t],
  );

  const textFlow = useMemo(
    () =>
      buildGraph(
        t,
        "schedules.flowChart.",
        ({ labelWithIcon }) => [
          labelWithIcon({ id: "textMessage", icon: "chat-left-text" }),
          labelWithIcon({
            id: "noActiveShiftTextMessage",
            icon: "chat-right-text-fill",
          }),
          labelWithIcon({ id: "outboundText", icon: "chat-right-text-fill" }),
          labelWithIcon({
            id: "outboundEmail",
            icon: "envelope-arrow-down-fill",
          }),
        ],
        ({ edge }) => [
          edge({ source: "textMessage", target: "outboundText" }),
          edge({ source: "textMessage", target: "outboundEmail" }),
          edge({
            source: "textMessage",
            target: "noActiveShiftTextMessage",
            labelId: "ifNoActiveShift",
          }),
        ],
      ),
    [t],
  );

  const combinedFlow = useMemo(
    () => ({
      nodes: [...phoneFlow.nodes, ...textFlow.nodes],
      edges: [...phoneFlow.edges, ...textFlow.edges],
    }),
    [phoneFlow, textFlow],
  );

  return (
    <>
      <title>{schedule.name}</title>

      <header className="mb-4">
        <h1>{schedule.name}</h1>
      </header>

      <section className="mb-2">
        <div className="d-flex">
          <div className="flex-grow-1"></div>
          <div>
            <Link to="./edit" className="btn btn-primary">
              {t("buttons.edit")}
            </Link>
          </div>
        </div>

        <div style={{ width: "100%", height: "80vh" }}>
          <Suspense fallback={<LoadingIndicator />}>
            <LayoutFlow
              initialNodes={combinedFlow.nodes}
              initialEdges={combinedFlow.edges}
            />
          </Suspense>
        </div>

        <table className="table table-striped">
          <tbody>
            <tr>
              <th scope="row">{t("schedules.welcomeMessage.label")}</th>
              <td>{schedule.welcomeMessage}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.emailFrom.label")}</th>
              <td>{schedule.emailFrom}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.postCallTextTemplate.label")}</th>
              <td>
                <HighlightedText text={schedule.postCallTextTemplate} />
              </td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.callTimeout.label")}</th>
              <td>{schedule.callTimeout}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.voicemailMessage.label")}</th>
              <td>{schedule.voicemailMessage}</td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.voicemailSilenceTimeout.label")}
              </th>
              <td>{schedule.voicemailSilenceTimeout}</td>
            </tr>
            <tr>
              <th scope="row">{t("schedules.voicemailNotification.title")}</th>
              <td>
                <dl>
                  <dt>{t("schedules.voicemailEmailSubjectTemplate.label")}</dt>
                  <dd>
                    <HighlightedText
                      text={schedule.voicemailEmailSubjectTemplate}
                    />
                  </dd>

                  <dt>{t("schedules.voicemailEmailBodyTemplate.label")}</dt>
                  <dd>
                    <HighlightedText
                      text={schedule.voicemailEmailBodyTemplate}
                    />
                  </dd>

                  <dt>{t("schedules.voicemailTextTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.voicemailTextTemplate} />
                  </dd>
                </dl>
              </td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.noActiveShiftTextMessage.label")}
              </th>
              <td>{schedule.noActiveShiftTextMessage}</td>
            </tr>
            <tr>
              <th scope="row">
                {t("schedules.textReceivedNotification.title")}
              </th>
              <td>
                <dl>
                  <dt>{t("schedules.textEmailSubjectTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textEmailSubjectTemplate} />
                  </dd>

                  <dt>{t("schedules.textEmailBodyTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textEmailBodyTemplate} />
                  </dd>

                  <dt>{t("schedules.textResponderTemplate.label")}</dt>
                  <dd>
                    <HighlightedText text={schedule.textResponderTemplate} />
                  </dd>
                </dl>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
