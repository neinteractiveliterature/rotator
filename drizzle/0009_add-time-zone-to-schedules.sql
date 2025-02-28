ALTER TABLE "schedules" ADD COLUMN "time_zone" text;

UPDATE schedules SET time_zone = 'America/New_York';

ALTER TABLE "schedules" ALTER COLUMN "time_zone" SET NOT NULL;
