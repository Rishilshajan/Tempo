import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { log } from "@/lib/logger";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  log.error(
    "DATABASE_URL is not set. Copy .env.example to .env and add your Supabase connection string.",
  );
  throw new Error("DATABASE_URL is not set.");
}

// Reuse the client across hot-reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

log.success("Drizzle DB client initialized");

export const db = drizzle(client, { schema });
export { schema };
