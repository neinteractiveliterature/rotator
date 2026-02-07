/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./.sst/platform/config.d.ts" />

import type { Output } from "@pulumi/pulumi";

const COPY_FILES = [
  {
    from: "drizzle",
    to: "./drizzle",
  },
  {
    from: "rds-global-bundle.pem",
    to: "./rds-global-bundle.pem",
  },
];

export function buildAndRunMigrator(databaseUrl: string | Output<string>) {
  const migrator = new sst.aws.Function("MigratorFn", {
    handler: "drizzle/migrate.handler",
    copyFiles: COPY_FILES,
    timeout: "10 minutes",
    environment: {
      DATABASE_URL: databaseUrl,
    },
    runtime: "nodejs22.x",
    nodejs: {
      loader: {
        ".pem": "text",
      },
    },
  });
  const migratorInvocation = new aws.lambda.Invocation("MigratorInvocation", {
    functionName: migrator.name,
    input: JSON.stringify({
      now: new Date().toISOString(),
    }),
  });
  return { migrator, migratorInvocation };
}

export default $config({
  app(input) {
    return {
      name: "rotator",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const APP_URL_BASE = new sst.Secret("APP_URL_BASE");
    const DATABASE_URL = new sst.Secret("DATABASE_URL");
    const DEFAULT_COUNTRY_CODE = new sst.Secret("DEFAULT_COUNTRY_CODE");
    const OAUTH2_SERVER_BASE = new sst.Secret("OAUTH2_SERVER_BASE");
    const OAUTH2_CLIENT_ID = new sst.Secret("OAUTH2_CLIENT_ID");
    const OAUTH2_CLIENT_SECRET = new sst.Secret("OAUTH2_CLIENT_SECRET");
    const SECRET_KEY_BASE = new sst.Secret("SECRET_KEY_BASE");
    const SMTP_URL = new sst.Secret("SMTP_URL");
    const TWILIO_AUTH_TOKEN = new sst.Secret("TWILIO_AUTH_TOKEN");
    const TWILIO_SID = new sst.Secret("TWILIO_SID");

    const { migratorInvocation } = buildAndRunMigrator(DATABASE_URL.value);

    new sst.aws.React(
      "Rotator",
      {
        domain: {
          name: "rotator.interactiveliterature.org",
          dns: sst.cloudflare.dns(),
        },
        environment: {
          APP_URL_BASE: APP_URL_BASE.value,
          DATABASE_URL: DATABASE_URL.value,
          DEFAULT_COUNTRY_CODE: DEFAULT_COUNTRY_CODE.value,
          OAUTH2_SERVER_BASE: OAUTH2_SERVER_BASE.value,
          OAUTH2_CLIENT_ID: OAUTH2_CLIENT_ID.value,
          OAUTH2_CLIENT_SECRET: OAUTH2_CLIENT_SECRET.value,
          SECRET_KEY_BASE: SECRET_KEY_BASE.value,
          SMTP_URL: SMTP_URL.value,
          TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN.value,
          TWILIO_SID: TWILIO_SID.value,
        },
        server: {
          runtime: "nodejs22.x",
        },
        transform: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          server(args, _opts, _name) {
            if (args.copyFiles && Array.isArray(args.copyFiles)) {
              args.copyFiles.concat(COPY_FILES);
            } else {
              args.copyFiles = COPY_FILES;
            }
          },
        },
      },
      { dependsOn: [migratorInvocation] },
    );
  },
});
