import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env" });

let db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  db ??= drizzle(databaseUrl);
  return db;
}
