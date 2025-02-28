ALTER TABLE "schedules" ADD COLUMN "no_active_shift_text_message" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "text_email_subject_template" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "text_email_body_template" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "text_responder_template" text;

UPDATE schedules
SET
  no_active_shift_text_message = 'We''re sorry, but this phone number is currently closed for texts.',
  text_email_subject_template = 'Text received',
  text_email_body_template = E'We received a text message from {{ from }}.  {% if responderIndex == 0 %}You''re on call, so we also forwarded it to you by text.{% else %}It''s being forwarded to you because you are currently on backup; we have texted the on-call person as well.{% endif %}\n\nMessage follows:\n\n{{ body }}',
  text_responder_template = 'Text from {{ from }}: {{ body }}';

ALTER TABLE "schedules" ALTER COLUMN "no_active_shift_text_message" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "text_email_subject_template" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "text_email_body_template" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "text_responder_template" SET NOT NULL;
