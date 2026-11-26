/**
 * Sanity-check the built topical index: every paper's question marks should add
 * up to the total printed on its cover, no question should be empty, and page
 * ranges should not overlap in a way that repeats pages.
 *
 * Usage: node scripts/validate-topical.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";

const OUT_DIR = new URL("../public/topical-data/", import.meta.url);
const PAPERS = new URL("../src/data/papers.json", import.meta.url);
const CACHE = new URL("../.cache-question-pages/", import.meta.url);

const hash = (u) => createHash("sha1").update(u).digest("hex");
const STATED = /total mark for this paper is\s+(\d+)/i;

const papers = (JSON.parse(await readFile(PAPERS, "utf8")).subjects ?? [])
  .flatMap((s) => s.units)
  .flatMap((u) => u.papers);
const byId = new Map(papers.filter((p) => p.qp?.url).map((p) => [[p.code, p.session, p.year, p.variant ?? ""].join("|"), p]));

const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".json"));
let papers_ = 0;
let mismatches = 0;
let zeroMarks = 0;
let empty = 0;
let overlap = 0;
const notes = [];

for (const file of files) {
  const data = JSON.parse(await readFile(new URL(file, OUT_DIR), "utf8"));
  for (const paper of data.papers) {
    papers_++;
    const qp = byId.get(paper.id);
    const cacheFile = new URL(`${hash(qp.qp.url)}.txt`, CACHE);
    let stated = null;
    if (existsSync(cacheFile) && statSync(cacheFile).size > 200) {
      const raw = await readFile(cacheFile, "utf8");
      const head = raw.slice(0, 6000);
      stated = Number(STATED.exec(head)?.[1] ?? 0) || null;
    }
    const sum = paper.questions.reduce((n, q) => n + q.marks, 0);
    if (stated && sum !== stated) {
      mismatches++;
      notes.push(`${paper.id}: marks ${sum} vs stated ${stated} (${paper.questions.length} q)`);
    }
    for (const q of paper.questions) {
      if (!q.marks) zeroMarks++;
      if (q.to < q.from || q.from > paper.pages) empty++;
    }
    for (let i = 1; i < paper.questions.length; i++) {
      if (paper.questions[i].from < paper.questions[i - 1].to) overlap++;
    }
  }
}

console.log({ papers: papers_, markMismatches: mismatches, zeroMarkQuestions: zeroMarks, brokenRanges: empty, overlaps: overlap });
for (const note of notes.slice(0, 40)) console.log(note);
console.log(`… ${notes.length} mismatches total`);
