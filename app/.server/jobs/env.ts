export type JobAdapter = "async" | "test" | "sqs";

/**
 * How `.perform()` runs a job; one explicit setting per environment (like Rails' `config.active_job.queue_adapter`):
 *   "async" - run the job immediately, in-process, without making the caller wait (local dev)
 *   "test"  - do nothing; a test that wants the job's behavior calls `job.handler()` or `job.enqueue()` itself
 *   "sqs"   - send a message to JOBS_QUEUE_URL for the consumer Lambda to pick up (deployed stages)
 * Read on each call rather than at import, so tests can change it.
 */
export function jobAdapter(): JobAdapter {
  const adapter = process.env.JOB_ADAPTER;
  if (adapter === "async" || adapter === "test" || adapter === "sqs") {
    return adapter;
  }
  throw new Error(
    `JOB_ADAPTER must be "async", "test" or "sqs" (got ${JSON.stringify(adapter)})`,
  );
}
