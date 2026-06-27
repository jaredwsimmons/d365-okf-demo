import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./connection";

// Stable int64 — picked once. Don't change; existing replicas would deadlock.
const MIGRATION_LOCK_ID = 918273645;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
    });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    client.release();
  }
}
