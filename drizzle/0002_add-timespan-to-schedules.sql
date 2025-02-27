ALTER TABLE "schedules" ADD COLUMN "timespan" "tsrange";
UPDATE schedules SET timespan = tsrange('["1970-01-01 00:00:00","2100-01-01 00:00:00")');
ALTER TABLE "schedules" ALTER COLUMN "timespan" SET NOT NULL;
