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
