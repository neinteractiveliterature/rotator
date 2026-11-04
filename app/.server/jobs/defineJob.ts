import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { jobAdapter } from "./env";
import { getJobContext, type JobContext } from "./jobContext.server";

type JobDefinition<TPayload> = {
  /** Unique across every job: it's the dispatch key on the shared queue. */
  name: string;
  handler: (payload: TPayload, ctx: JobContext) => Promise<void>;
  /** Only applied under the "sqs" adapter (SQS's DelaySeconds); the other adapters run the job right away. */
  delaySeconds?: number;
};

export type Job<TPayload> = {
  name: string;
  /** The job's logic, exposed so tests can call it directly with their own context. */
  handler: (payload: TPayload, ctx: JobContext) => Promise<void>;
  /** Always sends the real SQS message, whatever the adapter is. */
  enqueue: (payload: TPayload) => Promise<void>;
  /**
   * The call site everywhere else in the app: does whatever the adapter says. Never makes the caller wait for the job
   * itself to finish, in any adapter.
   */
  perform: (payload: TPayload) => Promise<void>;
};

// Holds handlers for many different payload types under one key type. Translating an untyped, just-parsed message body
// back into a specific job's payload is something only a runtime name lookup can do, so this is the one place the
// payload type is erased.
type RegisteredHandler = (payload: unknown, ctx: JobContext) => Promise<void>;
const registry = new Map<string, RegisteredHandler>();

/**
 * Defines a background job. Every job shares one queue (JOBS_QUEUE_URL); `dispatchJob` routes a message from it back to
 * the right handler by name. Delivery is at-least-once, so a handler has to tolerate running twice, and should read the
 * state it needs from the database rather than trust the payload to still be current.
 */
export function defineJob<TPayload>(
  def: JobDefinition<TPayload>,
): Job<TPayload> {
  registry.set(def.name, def.handler as RegisteredHandler);

  async function enqueue(payload: TPayload): Promise<void> {
    const queueUrl = process.env.JOBS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error(
        `JOBS_QUEUE_URL is not configured; can't enqueue "${def.name}" in this environment`,
      );
    }
    const sqs = new SQSClient({ region: process.env.AWS_REGION });
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ jobName: def.name, payload }),
        DelaySeconds: def.delaySeconds,
      }),
    );
  }

  async function perform(payload: TPayload): Promise<void> {
    const adapter = jobAdapter();
    if (adapter === "test") return;
    if (adapter === "async") {
      void def.handler(payload, getJobContext()).catch((err: unknown) => {
        console.error(`Job "${def.name}" failed:`, err);
      });
      return;
    }
    await enqueue(payload);
  }

  return { name: def.name, handler: def.handler, enqueue, perform };
}

/**
 * Routes a queue message back to the job it was enqueued for. Throws for an unregistered name rather than skipping it:
 * that's a deploy-ordering bug or a renamed job with a message still in flight, which should reach Sentry and the DLQ.
 */
export async function dispatchJob(
  jobName: string,
  payload: unknown,
  ctx: JobContext,
): Promise<void> {
  const handler = registry.get(jobName);
  if (!handler) {
    throw new Error(`No job registered for name "${jobName}"; can't dispatch`);
  }
  await handler(payload, ctx);
}
