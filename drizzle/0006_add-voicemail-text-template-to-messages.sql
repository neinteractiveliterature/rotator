ALTER TABLE "schedules" ADD COLUMN "voicemail_text_template" text;
UPDATE schedules SET voicemail_text_template = 'Received voicemail from {{ from }}: {{ recordingUrlMp3 }}';
ALTER TABLE "schedules" ALTER COLUMN "voicemail_text_template" SET NOT NULL;
