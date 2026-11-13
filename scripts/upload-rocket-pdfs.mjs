/**
 * Uploads the Rocket Revise topical PDFs to Vercel Blob so Paprivo hosts them
 * (public, served inline) instead of deep-linking Google Drive. Writes
 * src/data/rocket-hosting.json with the store's base URL, which
 * build-rocket-packs.mjs then uses for every pack link.
 *
 * Needs BLOB_READ_WRITE_TOKEN — `vercel env pull .env.local` supplies it.
 *
 * Usage:
 *   node scripts/upload-rocket-pdfs.mjs             # upload everything
 *   node scripts/upload-rocket-pdfs.mjs --limit 2   # smoke test
 *   node scripts/upload-rocket-pdfs.mjs --dry-run   # list what would upload
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveFile, SOURCE_DIR, SKIP_FILES } from "./build-rocket-packs.mjs";

const HOSTING = "src/data/rocket-hosting.json";
const ENDPOINT = "https://blob.vercel-storage.com";
const UA = "Mozilla/5.0 (compatible; Paprivo upload)";

async function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const env = await readFile(".env.local", "utf8").catch(() => "");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("BLOB_READ_WRITE_TOKEN="));
  if (!line) throw new Error("BLOB_READ_WRITE_TOKEN not found — run `vercel env pull .env.local`");
  return line.slice("BLOB_READ_WRITE_TOKEN=".length).replace(/^"|"$/g, "").trim();
}

async function walk(dir) {
  const { readdir } = await import("node:fs/promises");
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.pdf$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function mapLimit(items, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        await fn(items[index], index);
      }
    }),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.indexOf("--limit");
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

  if (!existsSync(SOURCE_DIR)) throw new Error(`collection not found: ${SOURCE_DIR}`);
  const files = (await walk(SOURCE_DIR)).sort();
  const jobs = [];
  for (const full of files) {
    const rel = path.relative(SOURCE_DIR, full).split(path.sep).join("/");
    if (SKIP_FILES.has(rel)) continue;
    const resolved = resolveFile(rel);
    if (!resolved) continue;
    jobs.push({ full, pathname: resolved.pathname, unit: resolved.unit });
  }
  const queue = jobs.slice(0, limit);
  console.log(`${jobs.length} PDFs to upload${limit < jobs.length ? ` (limited to ${limit})` : ""}`);
  if (dryRun) {
    for (const job of queue.slice(0, 10)) console.log(`  ${job.pathname}`);
    return;
  }

  const auth = await token();
  const uploaded = [];
  const failed = [];

  await mapLimit(queue, 4, async (job) => {
    const body = await readFile(job.full);
    const res = await fetch(`${ENDPOINT}/${job.pathname}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${auth}`,
        "x-api-version": "7",
        "x-content-type": "application/pdf",
        "x-add-random-suffix": "0",
        "x-vercel-blob-access": "public",
        "x-cache-control-max-age": "2592000",
        "user-agent": UA,
      },
      body,
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text();
    if (!res.ok) {
      failed.push(`${job.pathname} (HTTP ${res.status}: ${text.slice(0, 120)})`);
      return;
    }
    let url = null;
    try {
      url = JSON.parse(text).url;
    } catch {
      /* fall through */
    }
    if (!url) failed.push(`${job.pathname} (no url in response)`);
    else uploaded.push({ pathname: job.pathname, url });
    process.stdout.write(".");
  });
  console.log("");

  if (failed.length) {
    console.error(`failed ${failed.length}:\n  ${failed.join("\n  ")}`);
    process.exit(1);
  }

  const base = uploaded[0].url.slice(0, uploaded[0].url.length - uploaded[0].pathname.length).replace(/\/$/, "");
  await writeFile(
    HOSTING,
    JSON.stringify(
      {
        base,
        note: "Paprivo-hosted copies on Vercel Blob; written by upload-rocket-pdfs.mjs. Blob URLs open inline; append ?download=1 to force a download.",
        uploadedAt: new Date().toISOString(),
        count: uploaded.length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`uploaded ${uploaded.length} PDFs to ${base}`);
  console.log(`wrote ${HOSTING}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
