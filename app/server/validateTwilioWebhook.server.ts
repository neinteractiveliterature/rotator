import { validateRequest } from "twilio/lib/webhooks/webhooks";

export async function validateTwilioWebhook(request: Request) {
  const params = Object.fromEntries((await request.formData()).entries());
  if (process.env.SKIP_TWILIO_WEBHOOK_VALIDATION) {
    return params;
  }

  const twilioSignature = request.headers.get("X-Twilio-Signature");
  if (!twilioSignature) {
    throw new Response(
      "No signature header error - X-Twilio-Signature header does not exist, maybe this request is not coming from Twilio.",
      {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }

  const webhookUrl = new URL(request.url);
  if (request.headers.get("X-Forwarded-Proto")) {
    webhookUrl.protocol = request.headers.get("X-Forwarded-Proto") ?? "";
  }

  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN ?? "",
    twilioSignature,
    webhookUrl.toString(),
    params
  );

  if (!isValid) {
    throw new Response("Twilio Request Validation Failed.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return params;
}
