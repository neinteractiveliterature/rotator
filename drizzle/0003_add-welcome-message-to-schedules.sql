ALTER TABLE "schedules" ADD COLUMN "welcome_message" text;
UPDATE schedules SET welcome_message = 'Welcome. Directing your call to the staff member on duty.';
ALTER TABLE "schedules" ALTER COLUMN "welcome_message" SET NOT NULL;
