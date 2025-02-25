ALTER TABLE "schedules" ADD COLUMN "name" text;
UPDATE schedules SET name = 'Schedule ' || id;
ALTER TABLE "schedules" ALTER COLUMN "name" SET NOT NULL;
