import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export function twimlSayResponse(text: string) {
  const twiml = new VoiceResponse();
  twiml.say({ voice: "woman" }, text);

  return new Response(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
