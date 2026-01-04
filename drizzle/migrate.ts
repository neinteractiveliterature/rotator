import { migrate } from "drizzle-orm/node-postgres/migrator";
import { connectDb } from "./db";

export async function handler() {
  const db = connectDb();
  await migrate(db, {
    migrationsFolder: "./drizzle",
  });

  console.log("migrator success");
}
