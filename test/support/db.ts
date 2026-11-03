import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Client } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "~/db/schema";

export type Db = NodePgDatabase<typeof schema>;

// Tests that touch the database run against a real Postgres server (TEST_DATABASE_URL; any local install works, and CI
// provides one). To let test files run in parallel without colliding on unique values, each Vitest worker process gets its
// own database, named after TEST_DATABASE_URL's with a `_worker_<id>` suffix, created and migrated by the first test file
// the worker runs. Within a worker, every test file runs inside one transaction that is never committed, and each test
// runs inside a savepoint of it, so nothing a test writes survives it.

const WORKER_DB_SUFFIX = process.env["VITEST_POOL_ID"] ?? "0";
const UTC = { options: "-c timezone=UTC" } as const;

let workerDbReady = false;
let testDb: Db | null = null;
let client: Client | null = null;

async function ensureWorkerDatabase(baseUrl: URL): Promise<URL> {
  const workerUrl = new URL(baseUrl);
  const dbName = `${baseUrl.pathname.slice(1)}_worker_${WORKER_DB_SUFFIX}`;
  workerUrl.pathname = `/${dbName}`;

  // CREATE DATABASE can't run inside a transaction, or from the database it creates, so the base database's connection is
  // borrowed to create the worker's.
  const admin = new Client({ connectionString: baseUrl.toString(), ...UTC });
  await admin.connect();
  try {
    const { rows } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (rows.length === 0) {
      // The name is built only from TEST_DATABASE_URL's own database name and a numeric worker id.
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
  return workerUrl;
}

/**
 * The test database, for tests to query and pass to code under test. A stable proxy, so it's safe to reference before
 * `setupDb()` has run (in `vi.mock` factories, say); using it before then throws.
 */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    if (!testDb) {
      throw new Error(
        "Test database not initialized; call setupDb() in beforeAll",
      );
    }
    return (testDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Call in `beforeAll`. Connects to this worker's own database and opens the transaction every test in the file runs in.
 *
 * It's one dedicated Client rather than a Pool on purpose: BEGIN and SAVEPOINT only scope the queries that run on the same
 * connection, and a Pool may hand each query a different one.
 */
export async function setupDb() {
  const connectionString = process.env["TEST_DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL must point at a Postgres server to run the database tests",
    );
  }
  const workerUrl = await ensureWorkerDatabase(new URL(connectionString));
  client = new Client({ connectionString: workerUrl.toString(), ...UTC });
  await client.connect();
  testDb = drizzle(client, { casing: "snake_case", schema });
  if (!workerDbReady) {
    await migrate(testDb, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    workerDbReady = true;
  }
  await client.query("BEGIN");
}

/** Call in `afterAll`. Discards everything the file's tests wrote and closes the connection. */
export async function teardownDb() {
  await client?.query("ROLLBACK");
  await client?.end();
  testDb = null;
  client = null;
}

/** Call in `beforeEach`: starts the savepoint that isolates one test from the next. */
export async function resetDb() {
  await client!.query("SAVEPOINT test_isolation");
}

/** Call in `afterEach`: rolls back everything the test wrote. */
export async function rollbackDb() {
  await client!.query("ROLLBACK TO SAVEPOINT test_isolation");
  await client!.query("RELEASE SAVEPOINT test_isolation");
}

/**
 * Call in `beforeAll` (after `setupDb()`) in a test file whose code under test opens its own `db.transaction()`. A real
 * nested BEGIN can't run inside the file's outer transaction, so this swaps it for a SAVEPOINT, which is Postgres's
 * nestable transaction. An error inside the callback rolls back to that savepoint, as a real transaction would; without
 * that, a callback that's expected to fail (on a unique violation, say) would leave the connection aborted for the rest of
 * the test.
 */
export function stubDbTransactions() {
  if (!testDb || !client) {
    throw new Error(
      "Test database not initialized; call setupDb() in beforeAll",
    );
  }
  const realDb = testDb;
  const connection = client;
  let depth = 0;
  realDb.transaction = (async (callback: (tx: Db) => unknown) => {
    const savepoint = `test_tx_stub_${depth++}`;
    await connection.query(`SAVEPOINT ${savepoint}`);
    try {
      const result = await callback(realDb);
      await connection.query(`RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      await connection.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      throw error;
    } finally {
      depth--;
    }
  }) as unknown as typeof realDb.transaction;
}
