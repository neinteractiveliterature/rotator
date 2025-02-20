import type { Route } from "./+types/incoming";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export async function action({ context, request }: Route.ActionArgs) {
  await context.validateTwilioWebhook(request);

  const twiml = new VoiceResponse();
  twiml.say("Hello, world!");

  return new Response(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
