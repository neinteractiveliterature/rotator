import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import sslRootCert from "../rds-global-bundle.pem?raw";
import * as schema from "app/db/schema";

export function connectDb() {
  const DATABASE_URL = process.env.DATABASE_URL!;
  console.log("connecting to database:", DATABASE_URL);

  const client = new Pool({
    connectionString: DATABASE_URL,
    ssl: { ca: sslRootCert },
  });

  const db = drizzle(client, {
    casing: "snake_case",
    schema,
    logger: true,
  });

  return db;
}
