ALTER TABLE "schedules" ADD COLUMN "post_call_text_template" text;
UPDATE schedules SET post_call_text_template = 'Thanks for taking a call! The number of the caller was: {{ from }}';
ALTER TABLE "schedules" ALTER COLUMN "post_call_text_template" SET NOT NULL;
