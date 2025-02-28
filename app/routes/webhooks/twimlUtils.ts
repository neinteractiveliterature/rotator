import MessagingResponse from "twilio/lib/twiml/MessagingResponse";
import type TwiML from "twilio/lib/twiml/TwiML";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export function twimlResponse(twiml: TwiML) {
  return new Response(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export function twimlSayResponse(text: string) {
  const twiml = new VoiceResponse();
  twiml.say({ voice: "woman" }, text);

  return twimlResponse(twiml);
}

export function twimlMessageResponse({
  text,
  fromPhoneNumber,
  toPhoneNumber,
}: {
  text: string;
  fromPhoneNumber: string;
  toPhoneNumber: string;
}) {
  const twiml = new MessagingResponse();
  twiml.message({ to: toPhoneNumber, from: fromPhoneNumber }, text);

  return twimlResponse(twiml);
}

export function twimlCallResponse({
  sayText,
  phoneNumber,
  attributes,
}: {
  sayText?: string;
  phoneNumber: string;
  attributes: VoiceResponse.DialAttributes;
}) {
  const twiml = new VoiceResponse();

  if (sayText) {
    twiml.say({ voice: "woman" }, sayText);
  }

  twiml.dial(attributes, phoneNumber);

  return twimlResponse(twiml);
}

export function twimlVoicemailResponse({
  sayText,
  attributes,
}: {
  sayText: string;
  attributes: VoiceResponse.RecordAttributes;
}) {
  const twiml = new VoiceResponse();

  if (sayText) {
    twiml.say({ voice: "woman" }, sayText);
  }

  twiml.record(attributes);

  return twimlResponse(twiml);
}

export function twimlHangupResponse() {
  const twiml = new VoiceResponse();
  twiml.hangup();
  return twimlResponse(twiml);
}
