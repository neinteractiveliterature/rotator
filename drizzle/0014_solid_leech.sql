ALTER TABLE "oauth2_providers" ALTER COLUMN "code_challenge_method" SET DATA TYPE integer USING code_challenge_method::integer;
