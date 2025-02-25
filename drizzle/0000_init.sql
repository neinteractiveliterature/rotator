CREATE TABLE "phone_numbers_schedules" (
	"phone_number_id" bigint NOT NULL,
	"schedule_id" bigint NOT NULL,
	CONSTRAINT "phone_numbers_schedules_phone_number_id_schedule_id_pk" PRIMARY KEY("phone_number_id","schedule_id")
);
--> statement-breakpoint
CREATE TABLE "phone_numbers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "phone_numbers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"phone_number" varchar(255) NOT NULL,
	"no_active_shift_message" text
);
--> statement-breakpoint
CREATE TABLE "responders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "responders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "schedules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1)
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shift_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"shift_id" bigint NOT NULL,
	"responder_id" bigint NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shifts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"schedule_id" bigint NOT NULL,
	"timespan" "tsrange" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "phone_numbers_schedules" ADD CONSTRAINT "phone_numbers_schedules_phone_number_id_phone_numbers_id_fk" FOREIGN KEY ("phone_number_id") REFERENCES "public"."phone_numbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers_schedules" ADD CONSTRAINT "phone_numbers_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_responder_id_responders_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."responders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shift_assignments_shift_id_index" ON "shift_assignments" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_responder_id_index" ON "shift_assignments" USING btree ("responder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_shift_id_responder_id_position_index" ON "shift_assignments" USING btree ("shift_id","responder_id","position");--> statement-breakpoint
CREATE INDEX "shifts_timespan_index" ON "shifts" USING gist ("timespan");--> statement-breakpoint
CREATE INDEX "shifts_schedule_id_index" ON "shifts" USING btree ("schedule_id");
