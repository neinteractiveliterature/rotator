// @vitest-environment node
import { SQSClient, type SendMessageCommand } from "@aws-sdk/client-sqs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { defineJob, dispatchJob } from "~/.server/jobs/defineJob";
import type { JobContext } from "~/.server/jobs/jobContext.server";
import { buildJobContext } from "../support/webhooks";

function withEnv(values: Record<string, string>, fn: () => Promise<void>) {
  const previous = Object.fromEntries(
    Object.keys(values).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, values);
  return fn().finally(() => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("perform", () => {
  test('under "test" (the default in this suite), does nothing', async () => {
    const handler =
      vi.fn<(payload: string, ctx: JobContext) => Promise<void>>();
    const job = defineJob({ name: "test-adapter-job", handler });
    await job.perform("payload");
    expect(handler).not.toHaveBeenCalled();
  });

  test('under "sqs", sends a message naming the job', async () => {
    const send = vi.fn<(command: SendMessageCommand) => Promise<object>>(
      async () => ({}),
    );
    vi.spyOn(SQSClient.prototype, "send").mockImplementation(send as never);
    const job = defineJob<{ id: number }>({
      name: "sqs-adapter-job",
      handler: async () => {},
      delaySeconds: 30,
    });

    await withEnv(
      { JOB_ADAPTER: "sqs", JOBS_QUEUE_URL: "https://sqs.test/queue" },
      () => job.perform({ id: 7 }),
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toEqual({
      QueueUrl: "https://sqs.test/queue",
      MessageBody: JSON.stringify({
        jobName: "sqs-adapter-job",
        payload: { id: 7 },
      }),
      DelaySeconds: 30,
    });
  });

  test('under "sqs", complains if there is no queue', async () => {
    const job = defineJob({ name: "no-queue-job", handler: async () => {} });
    await withEnv({ JOB_ADAPTER: "sqs", JOBS_QUEUE_URL: "" }, async () => {
      await expect(job.perform(1)).rejects.toThrow("JOBS_QUEUE_URL");
    });
  });

  test("refuses to run without a valid JOB_ADAPTER", async () => {
    const job = defineJob({ name: "no-adapter-job", handler: async () => {} });
    await withEnv({ JOB_ADAPTER: "bogus" }, async () => {
      await expect(job.perform(1)).rejects.toThrow("JOB_ADAPTER");
    });
  });
});

describe("dispatchJob", () => {
  test("runs the handler of the job with that name", async () => {
    const handler = vi.fn<
      (payload: { n: number }, ctx: JobContext) => Promise<void>
    >(async () => {});
    defineJob({ name: "dispatched-job", handler });
    const { ctx } = buildJobContext();

    await dispatchJob("dispatched-job", { n: 1 }, ctx);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual({ n: 1 });
    expect(handler.mock.calls[0][1]).toBe(ctx);
  });

  test("throws for a name nobody registered", async () => {
    const { ctx } = buildJobContext();
    await expect(dispatchJob("nope", {}, ctx)).rejects.toThrow(
      'No job registered for name "nope"',
    );
  });
});
