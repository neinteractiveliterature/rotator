import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from "@aws-lambda-powertools/batch";
import type { SQSBatchResponse, SQSHandler, SQSRecord } from "aws-lambda";
import { dispatchJob } from "./defineJob";
import { getJobContext } from "./jobContext.server";
import { captureRecordErrors, withSentry } from "./sentry";
// Importing the jobs registers them (defineJob's side effect) before the first record is processed.
import "./index";

/**
 * The one consumer for the shared Jobs queue. Each record is processed on its own (partial batch failure), so one bad
 * message only retries itself, and each failure is reported to Sentry.
 */
export const handler: SQSHandler = withSentry(
  async (sqsEvent, context): Promise<SQSBatchResponse> => {
    const ctx = getJobContext();
    const recordHandler = captureRecordErrors(async (record: SQSRecord) => {
      const { jobName, payload } = JSON.parse(record.body) as {
        jobName: string;
        payload: unknown;
      };
      await dispatchJob(jobName, payload, ctx);
    });

    return await processPartialResponse(
      sqsEvent,
      recordHandler,
      new BatchProcessor(EventType.SQS),
      { context },
    );
  },
);
