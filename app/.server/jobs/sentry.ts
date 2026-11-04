import * as Sentry from "@sentry/aws-serverless";
import type { Handler } from "aws-lambda";

// Sentry wiring for the jobs Lambda, which doesn't go through the web app's instrument.server.mjs. Uses
// @sentry/aws-serverless because it knows about the Lambda execution model (flush before the container freezes, report
// an invocation timing out).

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    // Sentry 11 collects much more by default than 10 did (sendDefaultPii off). This keeps the 10 behavior: texts and
    // voicemail details are personal data.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
        response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
    debug: !!process.env.SENTRY_DEBUG_LOGGING,
  });
}

/** Reports anything the handler throws before the execution context freezes. A passthrough when SENTRY_DSN isn't set. */
export function withSentry<TEvent, TResult>(
  handler: Handler<TEvent, TResult>,
): Handler<TEvent, TResult> {
  if (!dsn) return handler;
  return Sentry.wrapHandler(handler, { captureTimeoutWarning: true });
}

/**
 * Wraps the per-record callback given to processPartialResponse. withSentry alone isn't enough: BatchProcessor catches
 * each record's error and turns it into a batchItemFailures entry, so the handler returns normally and Sentry would
 * never see it. Capturing here and rethrowing keeps the partial-batch behavior.
 */
export function captureRecordErrors<TRecord>(
  recordHandler: (record: TRecord) => Promise<void>,
): (record: TRecord) => Promise<void> {
  return async (record) => {
    try {
      await recordHandler(record);
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  };
}
