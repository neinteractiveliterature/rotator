import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "app/db/schema";

export function connectDb() {
  const DATABASE_URL = process.env.DATABASE_URL!;
  console.log("connecting to database:", DATABASE_URL);

  const db = drizzle(DATABASE_URL, {
    casing: "snake_case",
    schema,
    logger: true,
  });

  return db;
}
