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

async function deleteSourceMaps(dir: string) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const entry of await fs.promises.readdir(dir, {
    withFileTypes: true,
  })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await deleteSourceMaps(entryPath);
    } else if (entry.name.endsWith(".map")) {
      await fs.promises.rm(entryPath);
    }
  }
}

async function loadSentryBuildEnv() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const envFilePath = path.join(process.cwd(), ".env.sentry-build-plugin");
  if (!fs.existsSync(envFilePath)) return;
  for (const line of fs.readFileSync(envFilePath, "utf-8").split("\n")) {
    const match = line.match(/^([^=\s#][^=]*)=(.+)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

// The release the Sentry SDKs tag events with. It has to match the release the web build's source maps are uploaded
// under, which the Sentry build plugin names from GITHUB_SHA in CI and from the current git commit otherwise.
async function sentryRelease() {
  if (process.env.SENTRY_RELEASE) return process.env.SENTRY_RELEASE;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const { execSync } = await import("node:child_process");
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

// Maps the jobs Lambda's stack frames back to source in Sentry: injects debug IDs into the bundle, uploads its source
// maps, and strips the .map files from the deployed zip. (The web app's source maps are uploaded by the Sentry Vite
// plugin during `react-router build`.)
async function processSentrySourceMaps(dir: string) {
  await loadSentryBuildEnv();
  const { default: SentryCLI } = await import("@sentry/cli");

  // Injecting is a local file operation, so it always runs
  await new SentryCLI(null, {}).execute(["sourcemaps", "inject", dir], true);

  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  if (!authToken || !org || !project) {
    console.log(
      "[Sentry] Skipping Lambda sourcemap upload: set SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT",
    );
  } else {
    await new SentryCLI(null, { authToken, org, project }).execute(
      ["sourcemaps", "upload", dir],
      true,
    );
  }

  // The injected debug IDs are all Sentry needs; the .map files are never read by Node at runtime
  await deleteSourceMaps(dir);
}

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
        ".node": "file",
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
    const SENTRY_DSN = new sst.Secret("SENTRY_DSN");
    const SMTP_URL = new sst.Secret("SMTP_URL");
    const TWILIO_AUTH_TOKEN = new sst.Secret("TWILIO_AUTH_TOKEN");
    const TWILIO_SID = new sst.Secret("TWILIO_SID");

    const release = await sentryRelease();

    const { migratorInvocation } = buildAndRunMigrator(DATABASE_URL.value);

    // Side effects of Twilio webhooks (texts and emails to responders) run as background jobs, so a slow or retried
    // webhook can't send them twice. Every job shares this one queue and is dispatched by name (app/.server/jobs).
    const jobsDlq = new sst.aws.Queue("JobsDLQ");
    const jobsQueue = new sst.aws.Queue("Jobs", {
      // 6x the consumer's timeout, AWS's rule of thumb, so a slow job isn't redelivered while still running
      visibilityTimeout: "6 minutes",
      dlq: jobsDlq.arn,
    });

    // The jobs consumer and the web app both talk to the database, SMTP and Twilio
    const appEnvironment = {
      APP_URL_BASE: APP_URL_BASE.value,
      DATABASE_URL: DATABASE_URL.value,
      DEFAULT_COUNTRY_CODE: DEFAULT_COUNTRY_CODE.value,
      OAUTH2_SERVER_BASE: OAUTH2_SERVER_BASE.value,
      OAUTH2_CLIENT_ID: OAUTH2_CLIENT_ID.value,
      OAUTH2_CLIENT_SECRET: OAUTH2_CLIENT_SECRET.value,
      SECRET_KEY_BASE: SECRET_KEY_BASE.value,
      SENTRY_DSN: SENTRY_DSN.value,
      // Read by the Sentry SDKs themselves, which otherwise tag every event with the default environment and no release
      SENTRY_ENVIRONMENT: $app.stage,
      ...(release ? { SENTRY_RELEASE: release } : {}),
      SMTP_URL: SMTP_URL.value,
      TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN.value,
      TWILIO_SID: TWILIO_SID.value,
      JOB_ADAPTER: "sqs",
      JOBS_QUEUE_URL: jobsQueue.url,
    };

    // Anything in JobsDLQ is a job that failed all of its attempts. Sentry sees a handler that throws, but not one the
    // Lambda runtime kills (timeout, out of memory), so this alarm is what makes either case visible. It notifies the
    // JobsAlerts topic; add the subscriptions (email, Slack, ...) that should hear about it.
    if ($app.stage === "production") {
      const alertsTopic = new aws.sns.Topic("JobsAlerts");
      new aws.cloudwatch.MetricAlarm("JobsDlqNotEmpty", {
        name: `${$app.name}-${$app.stage}-JobsDlqNotEmpty`,
        alarmDescription:
          "A background job failed all of its attempts and is waiting in the dead-letter queue (JobsDLQ). Inspect and redrive or delete the message.",
        namespace: "AWS/SQS",
        metricName: "ApproximateNumberOfMessagesVisible",
        dimensions: { QueueName: jobsDlq.nodes.queue.name },
        statistic: "Maximum",
        period: 300,
        evaluationPeriods: 1,
        threshold: 0,
        comparisonOperator: "GreaterThanThreshold",
        // An idle queue may publish no datapoints at all, which is the healthy case
        treatMissingData: "notBreaching",
        alarmActions: [alertsTopic.arn],
        okActions: [alertsTopic.arn],
      });
    }

    jobsQueue.subscribe(
      {
        handler: "app/.server/jobs/handler.handler",
        runtime: "nodejs22.x",
        nodejs: { sourcemap: true, loader: { ".node": "file" } },
        copyFiles: COPY_FILES,
        hook: { postbuild: (dir) => processSentrySourceMaps(dir) },
        timeout: "1 minute",
        memory: "256 MB",
        environment: appEnvironment,
      },
      { batch: { partialResponses: true } },
    );

    new sst.aws.React(
      "Rotator",
      {
        domain: {
          name: "rotator.interactiveliterature.org",
          dns: sst.cloudflare.dns(),
        },
        environment: appEnvironment,
        permissions: [
          // lets .perform() enqueue jobs
          { actions: ["sqs:SendMessage"], resources: [jobsQueue.arn] },
        ],
        server: {
          runtime: "nodejs22.x",
          loader: {
            ".node": "file",
          },
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
