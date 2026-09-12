import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Dual-driver database:
 *  - DATABASE_URL set  -> Neon serverless over HTTP (Vercel production)
 *  - DATABASE_URL empty -> embedded PGlite at ./local.db (local dev, zero setup)
 * Both share the same Drizzle schema; the schema is created idempotently on boot.
 */

type AnyDb = ReturnType<typeof drizzlePgLite<typeof schema>>;
export type Database = AnyDb;

const SCHEMA_VERSION = 1;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS _meta (key varchar(64) PRIMARY KEY, value varchar(255) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (
     id serial PRIMARY KEY,
     email varchar(320) NOT NULL UNIQUE,
     name varchar(120),
     password_hash text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS user_subjects (
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     subject_key varchar(40) NOT NULL,
     PRIMARY KEY (user_id, subject_key)
   )`,
  `CREATE TABLE IF NOT EXISTS paper_progress (
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     paper_id varchar(80) NOT NULL,
     status varchar(20) NOT NULL DEFAULT 'done',
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, paper_id)
   )`,
  `CREATE INDEX IF NOT EXISTS progress_user_idx ON paper_progress (user_id)`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
     user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     paper_id varchar(80) NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, paper_id)
   )`,
  `CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks (user_id)`,
];

const globalForDb = globalThis as unknown as {
  __ialDb?: Database;
  __ialEnsure?: Promise<void>;
};

function createDb(): Database {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return drizzleNeon(neon(url), { schema }) as unknown as Database;
  }
  const client = new PGlite("local.db");
  return drizzlePgLite(client, { schema }) as unknown as Database;
}

async function ensureSchema(db: Database): Promise<void> {
  for (const stmt of STATEMENTS) {
    await db.execute(sql.raw(stmt));
  }
  await db.execute(
    sql`INSERT INTO _meta (key, value) VALUES ('schema_version', ${String(SCHEMA_VERSION)})
        ON CONFLICT (key) DO UPDATE SET value = ${String(SCHEMA_VERSION)}`,
  );
}

export async function getDb(): Promise<Database> {
  if (!globalForDb.__ialDb) {
    globalForDb.__ialDb = createDb();
  }
  const db = globalForDb.__ialDb;
  if (!globalForDb.__ialEnsure) {
    globalForDb.__ialEnsure = ensureSchema(db).catch((e) => {
      globalForDb.__ialEnsure = undefined;
      throw e;
    });
  }
  await globalForDb.__ialEnsure;
  return db;
}
