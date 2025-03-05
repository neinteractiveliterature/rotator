CREATE TABLE "oauth2_providers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "oauth2_providers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"url" text NOT NULL,
	"authorization_endpoint" text NOT NULL,
	"token_endpoint" text NOT NULL,
	"code_challenge_method" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "oauth2_providers_url_index" ON "oauth2_providers" USING btree ("url");