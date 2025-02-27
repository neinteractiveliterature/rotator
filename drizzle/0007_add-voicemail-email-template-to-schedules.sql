ALTER TABLE "schedules" ADD COLUMN "email_from" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "voicemail_email_subject_template" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "voicemail_email_body_template" text;

UPDATE schedules
SET
  email_from = 'Rotator <rotator@interactiveliterature.org>',
  voicemail_email_subject_template = 'Voicemail received',
  voicemail_email_body_template = E'We received a voicemail.  {% if responderIndex == 0 %}You''re on call, so we also texted you about it.{% else %}It''s being forwarded to you because you are currently on backup; we have texted the on-call person as well.{% endif %}\n\nVoicemail from: {{ from }}\nTo listen: {{ recordingUrlMp3 }}';

ALTER TABLE "schedules" ALTER COLUMN "email_from" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "voicemail_email_subject_template" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "voicemail_email_body_template" SET NOT NULL;
