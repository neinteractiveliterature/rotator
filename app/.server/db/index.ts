import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "~/db/schema";

export type Db = NodePgDatabase<typeof schema>;

/**
 * The read-only slice of a database handle. `Db` and transactions both satisfy it structurally, so read helpers can
 * accept `ReadDb` and still run inside a caller's transaction.
 */
export type ReadDb = Pick<Db, "select" | "selectDistinct" | "query" | "$count">;
