/**
 * Fill .cache-question-pages/ with the page text of every question paper in the
 * catalogue that is not cached yet.
 *
 * The topical index builder segments a paper from its page text, so papers that
 * were never downloaded cannot be indexed. This fetches the missing ones (in
 * parallel, with retries), extracts one string per page with unpdf and writes
 * the same cache format the builder reads.
 *
 * Usage: node scripts/fetch-question-text.mjs [--force]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";

const PAPERS = new URL("../src/data/papers.json", import.meta.url);
const CACHE = new URL("../.cache-question-pages/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);

const CONCURRENCY = 6;
const MARKER = "\f\fFIRST_PAGE_BREAK\f\f";
const force = process.argv.includes("--force");

const hash = (url) => createHash("sha1").update(url).digest("hex");
const key = (p) => [p.code, p.session, p.year, p.variant ?? ""].join("|");

async function textFromPdf(bytes) {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return `${pages.length}${MARKER}${pages.map((p) => p.replace(/\r\n?/g, "\n")).join("\f")}`;
}

async function fetchPdf(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PaprivoIndexer/1.0)" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.length) throw new Error("empty response");
  if (!type.includes("pdf") && String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") {
    throw new Error(`not a PDF (${type || "no content-type"})`);
  }
  return bytes;
}

async function one(paper, attempt = 1) {
  const target = new URL(`${hash(paper.qp.url)}.txt`, CACHE);
  if (!force && existsSync(target) && statSync(target).size > 200) return { state: "cached" };
  try {
    const text = paper.qp.url.startsWith("/")
      ? await (async () => {
          const file = new URL(`.${paper.qp.url}`, publicDir);
          if (!existsSync(file)) throw new Error("local file missing");
          return textFromPdf(new Uint8Array(await readFile(file)));
        })()
      : await (async () => textFromPdf(await fetchPdf(paper.qp.url)))();
    await writeFile(target, text);
    return { state: "ok" };
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1_500 * attempt));
      return one(paper, attempt + 1);
    }
    return { state: "failed", error: err.message };
  }
}

const data = JSON.parse(await readFile(PAPERS, "utf8"));
const papers = data.subjects.flatMap((s) => s.units).flatMap((u) => u.papers);
await mkdir(CACHE, { recursive: true });

const counts = { ok: 0, cached: 0, failed: 0 };
const failures = [];
const queue = [...papers];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let paper = queue.shift(); paper; paper = queue.shift()) {
      const result = await one(paper);
      counts[result.state]++;
      if (result.state === "failed") failures.push({ key: key(paper), url: paper.qp.url, error: result.error });
      if ((counts.ok + counts.failed) % 20 === 0 && result.state !== "cached") {
        console.log(`… ${counts.ok} fetched, ${counts.failed} failed`);
      }
    }
  }),
);

console.log(counts);
for (const f of failures) console.log("FAILED", f.key, f.url, f.error);
