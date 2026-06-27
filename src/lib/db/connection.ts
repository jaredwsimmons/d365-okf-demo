import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { DefaultAzureCredential } from "@azure/identity";
import * as schema from "./schema";

const useEntra = process.env.PGAUTH === "entra";

// Production / cloud-DB local dev path: discrete PG* env vars + optional
// Entra token callback. Local Docker dev path: legacy DATABASE_URL.
function buildPoolConfig(): PoolConfig {
  if (process.env.PGHOST) {
    const config: PoolConfig = {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      ssl:
        process.env.PGSSLMODE === "disable"
          ? false
          : { rejectUnauthorized: true },
      // Entra access tokens live ~1h. Force idle connections to recycle well
      // before that so new ones fetch fresh tokens via the callback below.
      idleTimeoutMillis: 30 * 60 * 1000,
    };

    if (useEntra) {
      const credential = new DefaultAzureCredential();
      config.password = async () => {
        const token = await credential.getToken(
          "https://ossrdbms-aad.database.windows.net/.default",
        );
        if (!token?.token) {
          throw new Error("Failed to acquire Entra token for Postgres.");
        }
        return token.token;
      };
    } else {
      config.password = process.env.PGPASSWORD;
    }
    return config;
  }

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL must be set in production — no hardcoded connection string is used.",
    );
  }
  return {
    connectionString:
      process.env.DATABASE_URL ||
      // Dev-only convenience default; production requires DATABASE_URL (guarded above).
      "postgresql://postgres:postgres@localhost:5432/coe_dashboard",
  };
}

declare global {
  var __coeDbPool: Pool | undefined;
}

export const pool = globalThis.__coeDbPool ?? new Pool(buildPoolConfig());
if (process.env.NODE_ENV !== "production") {
  globalThis.__coeDbPool = pool;
}

export const db = drizzle(pool, { schema });
