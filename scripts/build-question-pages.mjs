/**
 * Build src/data/question-pages.json — a question → PDF page map for question
 * papers that use Pearson's answer-booklet layout, where every page belonging
 * to question N carries a "Question N" or "Question N continued" header. The
 * FIRST page carrying a question's header is its exact start page.
 *
 * Accuracy rules:
 *  - Only exact header signals are used; nothing is inferred or guessed.
 *  - A document's map is emitted only when questions 1..maxQ are ALL found
 *    with strictly ascending start pages — otherwise it is skipped and the
 *    UI links to the whole document instead.
 *  - Mark schemes do not print these headers, so they receive no map.
 *  - Gated (secure/) PDFs require a Pearson login and are not fetched.
 *
 * Usage:
 *   node scripts/build-question-pages.mjs            # full run (disk-cached)
 *   LIMIT=6 node scripts/build-question-pages.mjs    # smoke run on N docs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";

const DATA = new URL("../src/data/papers.json", import.meta.url);
const OUT = new URL("../src/data/question-pages.json", import.meta.url);
const CACHE_DIR = new URL("../.cache-question-pages/", import.meta.url);
const LIMIT = Number(process.env.LIMIT ?? 0);
const DELAY_MS = 200;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cachePath = (url) =>
  new URL(`${createHash("sha1").update(url).digest("hex")}.txt`, CACHE_DIR);

async function fetchDocText(url) {
  const cached = cachePath(url);
  if (existsSync(cached)) {
    const raw = await readFile(cached, "utf8");
    const [pagesStr, text] = raw.split("\f\fFIRST_PAGE_BREAK\f\f");
    return { totalPages: Number(pagesStr), text };
  }
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(buf.slice(0, 5));
  if (!head.startsWith("%PDF")) {
    throw new Error("not a PDF (login-walled or blocked)");
  }
  const pdf = await getDocumentProxy(buf);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const merged = text.join("\f");
  await writeFile(cached, `${totalPages}\f\fFIRST_PAGE_BREAK\f\f${merged}`, "utf8");
  return { totalPages, text: merged };
}

/**
 * Question start pages from booklet headers. Returns {} unless every
 * question 1..maxQ is found with strictly ascending start pages.
 */
function extractStartPages(text) {
  const pages = text.split("\f");
  const first = new Map(); // question number → first page carrying its header
  const re = /Question\s+(\d{1,2})\s*(?:continued)?\b/gi;
  pages.forEach((pg, i) => {
    for (const m of pg.matchAll(re)) {
      const q = Number(m[1]);
      if (q >= 1 && q <= 30 && !first.has(q)) first.set(q, i + 1);
    }
  });
  if (first.size === 0) return {};
  const maxQ = Math.max(...first.keys());
  if (maxQ < 3) return {}; // too few headers to trust
  const starts = {};
  let prev = 0;
  for (let q = 1; q <= maxQ; q++) {
    const p = first.get(q);
    if (p === undefined || p <= prev) return {}; // gap or inversion → unreliable
    starts[String(q)] = p;
    prev = p;
  }
  return starts;
}

async function main() {
  const papersData = JSON.parse(await readFile(DATA, "utf8"));
  await mkdir(CACHE_DIR, { recursive: true });

  // Collect unique non-gated QP documents
  const docs = new Map(); // url -> first ref label
  for (const subject of papersData.subjects) {
    for (const unit of subject.units) {
      for (const p of unit.papers) {
        const doc = p.qp;
        if (!doc?.url || doc.gated) continue;
        if (!docs.has(doc.url)) {
          docs.set(doc.url, `${p.code}|${p.session}|${p.year}|${p.variant ?? ""}`);
        }
      }
    }
  }
  const urls = [...docs.keys()];
  console.log(`Unique QP documents: ${urls.length}${LIMIT ? ` (limited to ${LIMIT})` : ""}`);

  const results = {}; // url -> starts map
  let done = 0, mapped = 0, failed = 0, skipped = 0;
  for (const url of urls) {
    if (LIMIT && done >= LIMIT) break;
    done++;
    const ref = docs.get(url);
    try {
      const { totalPages, text } = await fetchDocText(url);
      const starts = extractStartPages(text);
      const n = Object.keys(starts).length;
      if (n > 0) {
        results[url] = starts;
        mapped++;
        console.log(`[${done}/${LIMIT || urls.length}] ${ref} → ${totalPages}p, ${n} questions mapped`);
      } else {
        skipped++;
        console.log(`[${done}/${LIMIT || urls.length}] ${ref} → no exact headers (skipped)`);
      }
    } catch (err) {
      failed++;
      console.log(`[${done}/${LIMIT || urls.length}] ${ref} → FAILED: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  // Attach maps to papers
  const papers = {};
  let papersMapped = 0;
  for (const subject of papersData.subjects) {
    for (const unit of subject.units) {
      for (const p of unit.papers) {
        const doc = p.qp;
        if (!doc?.url || !results[doc.url]) continue;
        const key = [p.code, p.session, p.year, p.variant ?? ""].join("|");
        papers[key] = { qp: results[doc.url] };
        papersMapped++;
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    note: "Start pages come from exact 'Question N (continued)' booklet headers in the real PDFs; first header page = question start. Papers without reliable headers are absent (link to the whole document).",
    papers,
  };
  await writeFile(OUT, JSON.stringify(out), "utf8");
  console.log(
    `\nDone. ${done} docs processed → ${mapped} mapped, ${skipped} skipped, ${failed} failed. Papers with QP page map: ${papersMapped}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
