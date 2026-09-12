# Paprivo

**Past papers. Better preparation.**

A polished, free site for **Pearson Edexcel International AS/A Level** past papers (2019–2026) —
Maths (P1, P2, M1, M2, S1, S2), Physics, Chemistry and Biology — with user accounts, per-user
subject selection, progress tracking and bookmarks.

All links point to **official Pearson files** on qualifications.pearson.com. Nothing is rehosted:
papers are Pearson's copyright, and the newest sessions are marked with a 🔒 when Pearson itself
requires a (free) sign-in.

## Features

- **Complete catalogue** — 568 papers / 1,600+ documents generated from Pearson's own public search
  index (same one the official past-papers page uses), with typo/prefix contamination filtered out,
  contingency `UNUSED` files deduped, and revised mark schemes preferred.
- **Accounts** — email + password (bcrypt, Auth.js v5, JWT sessions). Guests can use everything and
  their data migrates into their account on sign-up.
- **Personalization** — pick your subjects (homepage/dashboard show just those), tick papers done,
  star bookmarks. Guests get the same via localStorage.
- **Honest empty states** — IAL Computer Science (2026 spec) has first exams in June 2027, so its
  page links the spec + sample materials instead of faking papers. Cancelled sessions (e.g. summer
  2020) simply don't exist in the catalogue — nothing is silently missing.
- Dark/light theme, responsive, SEO metadata + sitemap, accessible controls.

## Dev setup (Node 18+)

```bash
npm install
cp .env.example .env.local   # defaults work out of the box
npm run dev                  # http://localhost:3000
```

No database setup needed locally: with `DATABASE_URL` empty the app uses embedded
[PGlite](https://github.com/electric-sql/pglite) at `./local.db`.

## Deploying to Vercel

1. Push this repo to GitHub, then "Import Project" on Vercel.
2. In Vercel → Storage → **Create Database → Neon (Postgres)**, and connect it — this sets
   `DATABASE_URL` automatically.
3. Add env var `AUTH_SECRET` (generate with `openssl rand -base64 32`).
4. Deploy. Schema is created automatically on first run.

## Refreshing the paper catalogue

```bash
npm run papers   # regenerates src/data/papers.json from Pearson's index
```

Run it after each exam session (January/June/October) to pick up new papers, then redeploy.

## Structure

```
scripts/fetch-papers.mjs   # catalogue generator (npm run papers)
src/data/papers.json       # generated catalogue
src/db/                    # drizzle schema + dual PGlite/Neon driver
src/lib/                   # auth, state, paper helpers
src/app/[subject]/         # subject pages (mathematics, physics, ...)
src/app/api/               # register, me, progress, bookmarks, migrate, auth
```
