# Instant Postgres, zero setup locally

[Pglite](https://github.com/electric-sql/pglite) (Postgres in WASM) is used when `DATABASE_URL` is
empty (local dev). On Vercel with a Neon `DATABASE_URL`, the serverless driver is used. Both paths
share the same Drizzle schema.

If you change the schema in `src/db/schema.ts`, bump `SCHEMA_VERSION` in `src/db/index.ts` and
delete your local `local.db*` files.
