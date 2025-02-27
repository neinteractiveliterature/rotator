ALTER TABLE "schedules" ADD COLUMN "voicemail_message" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "call_timeout" integer;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "voicemail_silence_timeout" integer;

UPDATE schedules SET
  call_timeout = 10,
  voicemail_silence_timeout = 10,
  voicemail_message = 'We''re sorry, but no staff member could be reached. Please leave your name and number and we''ll get back to you as soon as possible.';

ALTER TABLE "schedules" ALTER COLUMN "voicemail_message" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "call_timeout" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "voicemail_silence_timeout" SET NOT NULL;
