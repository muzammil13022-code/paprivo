/**
 * Build the topical question index — Paprivo's own version of Auto Topical's
 * `index/<paper>.json` + `syllabus/<code>.json` pair.
 *
 * Inputs (all already in the repo):
 *   src/data/papers.json            the catalogue
 *   src/data/question-pages.json    exact question → page map from booklet headers
 *   .cache-question-pages/*.txt     per-page text of 466 question papers
 *   src/data/topical-topics.json    specification topics + question-text cues
 *
 * A paper is indexed only when its question boundaries are unambiguous:
 *
 *  1. Question numbers printed at the start of a line ("1. Find …", "3 The
 *     diagram shows …") forming a complete ascending run 1..N; or
 *  2. the answer-booklet headers ("Question N continued"), where a question's
 *     pages run from the page after the previous header to the one before its
 *     own. Papers whose numbers overlap or skip are dropped rather than guessed.
 *
 * Marks come from Pearson's own "(Total for Question 3 = 1 mark)" line, and
 * each question is labelled with the specification topics whose cues fire.
 *
 * Output: public/topical/<UNIT>.json for the builder UI, plus
 * src/data/topical-catalog.json with per-unit topic counts for the hub.
 *
 * Usage: node scripts/build-topical-index.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";

const PAPERS = new URL("../src/data/papers.json", import.meta.url);
const PAGES = new URL("../src/data/question-pages.json", import.meta.url);
const TOPICS = new URL("../src/data/topical-topics.json", import.meta.url);
const CACHE = new URL("../.cache-question-pages/", import.meta.url);
const OUT_DIR = new URL("../public/topical-data/", import.meta.url);
const CATALOG = new URL("../src/data/topical-catalog.json", import.meta.url);

const DEFAULT_WEIGHT = 2;
const DEFAULT_MIN = 4;
const MAX_TOPICS_PER_QUESTION = 2;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compileCue(raw) {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const weight = Array.isArray(raw) && typeof raw[1] === "number" ? raw[1] : DEFAULT_WEIGHT;
  let body = String(text);
  if (body.startsWith("re:")) return { re: new RegExp(body.slice(3)), weight };
  const closed = body.endsWith("|");
  if (closed) body = body.slice(0, -1);
  const phrase = body.toLowerCase().trim().split(/\s+/).map(escapeRegExp).join("\\s+");
  return { re: new RegExp(`(?:^|[^a-z0-9])${phrase}${closed ? "(?![a-z0-9])" : ""}`), weight };
}

function prepare(raw) {
  return raw.topics.map((t) => ({
    id: t.id,
    name: t.name,
    min: typeof t.min === "number" ? t.min : raw.defaultMin ?? DEFAULT_MIN,
    cues: (t.cues ?? []).map(compileCue),
  }));
}

const flatten = (text) => text.toLowerCase().replace(/\s+/g, " ");

function tagQuestion(text, topics) {
  const scored = [];
  for (const topic of topics) {
    let score = 0;
    for (const cue of topic.cues) if (cue.re.test(text)) score += cue.weight;
    if (score >= topic.min) scored.push({ id: topic.id, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOPICS_PER_QUESTION)
    .map((t) => t.id);
}

/** "… (Total for Question 3 = 1 mark)" → Map(3 → 1). */
const TOTAL_RE = /\(Total for Question\s+(\d+)\s*(?:is|=|:)\s*(\d+)\s*marks?\)/gi;

function totalsIn(text) {
  const out = new Map();
  for (const m of text.matchAll(TOTAL_RE)) out.set(Number(m[1]), Number(m[2]));
  return out;
}

/** Start page of every question printed at line start, or null. */
function numbersFromLines(pages) {
  const starts = new Map();
  pages.forEach((text, index) => {
    for (const line of text.split("\n")) {
      const m = /^(\d{1,2})(?:\.|\s)\s*(.*)$/.exec(line.trim());
      if (!m) continue;
      const q = Number(m[1]);
      const rest = m[2] ?? "";
      if (q < 1 || q > 40) continue;
      if (/^\d/.test(rest)) continue; // "14 500 N" is data, not a question
      if (!rest && q === index + 1) continue; // bare page number
      if (starts.has(q)) continue;
      starts.set(q, index + 1);
    }
  });
  const nums = [...starts.keys()].sort((a, b) => a - b);
  if (nums.length < 4 || !nums.every((n, i) => n === i + 1)) return null;
  // Equal start pages are normal: MCQ sections print several questions per page.
  for (let i = 1; i < nums.length; i++) if (starts.get(nums[i]) < starts.get(nums[i - 1])) return null;
  return starts;
}

/** Question pages derived from the booklet's "Question N continued" pages. */
function pagesFromHeaders(pages, map) {
  const nums = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (nums.length < 4) return null;
  for (let i = 1; i < nums.length; i++) if (map[String(nums[i])] <= map[String(nums[i - 1])]) return null;

  const ranges = [];
  let previousMarker = 1;
  for (const q of nums) {
    const marker = map[String(q)];
    let from = previousMarker + 1;
    let to = Math.min(marker - 1, pages.length);
    previousMarker = marker;
    while (from <= to && cleanBody(pages[from - 1]).length < 40) from++;
    while (to >= from && cleanBody(pages[to - 1]).length < 40) to--;
    if (to < from) continue;
    ranges.push({ q, from, to });
  }
  if (ranges.length !== nums.length) return null;
  return ranges;
}

function cleanBody(text) {
  return text
    .replace(/_{5,}/g, " ")
    .replace(/DO NOT WRITE IN THIS AREA/gi, " ")
    .replace(/Question\s+\d+\s*continued/gi, " ")
    .replace(/\(Total for Question[^)]*\)/gi, " ")
    .replace(/Turn over/gi, " ")
    .replace(/\*P[0-9A-Z]+\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(url) {
  return createHash("sha1").update(url).digest("hex");
}

async function pageText(paper, publicDir) {
  const cached = new URL(`${hash(paper.qp.url)}.txt`, CACHE);
  if (existsSync(cached)) {
    const raw = await readFile(cached, "utf8");
    const marker = "\f\fFIRST_PAGE_BREAK\f\f";
    const at = raw.indexOf(marker);
    if (at === -1) return null;
    return raw.slice(at + marker.length).split("\f");
  }
  if (paper.qp.url.startsWith("/")) {
    const file = new URL(`.${paper.qp.url}`, publicDir);
    if (!existsSync(file)) return null;
    const buf = new Uint8Array(await readFile(file));
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  }
  return null;
}

function paperKey(p) {
  return [p.code, p.session, p.year, p.variant ?? ""].join("|");
}

async function main() {
  const papersData = JSON.parse(await readFile(PAPERS, "utf8"));
  const starts = JSON.parse(await readFile(PAGES, "utf8")).papers ?? {};
  const topicsData = JSON.parse(await readFile(TOPICS, "utf8"));

  await mkdir(OUT_DIR, { recursive: true });
  const publicDir = new URL("../public/", import.meta.url);

  const catalog = { generatedAt: new Date().toISOString(), units: {} };
  const totals = { papers: 0, questions: 0, tagged: 0 };

  for (const subject of papersData.subjects) {
    for (const unit of subject.units) {
      const topicDefs = topicsData.units[unit.code];
      if (!topicDefs) continue;
      const topics = prepare({ ...topicsData, topics: topicDefs });

      const outPapers = [];
      for (const paper of unit.papers) {
        const pages = await pageText(paper, publicDir);
        if (!pages || pages.length < 4) continue;

        const markers = starts[paperKey(paper)]?.qp;
        const lines = numbersFromLines(pages);
        let ranges = lines
          ? [...lines.entries()]
              .sort((a, b) => a[1] - b[1])
              .map(([q, from], i, arr) => ({
                q,
                from,
                to: i + 1 < arr.length ? Math.max(from, arr[i + 1][1] - 1) : pages.length,
              }))
          : markers
            ? pagesFromHeaders(pages, markers)
            : null;
        if (ranges) {
          // Never end a question on blank ruling pages (usually the last one).
          const last = ranges[ranges.length - 1];
          while (last.to > last.from && cleanBody(pages[last.to - 1]).length < 40) last.to--;
        }
        if (!ranges) continue;

        const docTotals = totalsIn(pages.join("\n"));
        const questions = ranges.map(({ q, from, to }) => {
          const text = flatten(pages.slice(from - 1, to).join("\n"));
          return {
            q,
            from,
            to,
            marks: docTotals.get(q) ?? 0,
            topics: tagQuestion(text, topics),
          };
        });

        outPapers.push({
          id: paperKey(paper),
          session: paper.session,
          year: paper.year,
          variant: paper.variant ?? null,
          pages: pages.length,
          qp: paper.qp.url,
          ms: paper.ms && !paper.ms.gated ? paper.ms.url : null,
          // MCQ papers put several questions on one page, so a pack may show
          // neighbouring questions too — the UI says so.
          sharesPages: questions.some((q, i) => i > 0 && q.from === questions[i - 1].from),
          questions,
        });
      }

      if (outPapers.length === 0) {
        console.warn(`${unit.code}: no indexable papers`);
        continue;
      }
      outPapers.sort((a, b) => b.year - a.year || a.session.localeCompare(b.session));

      const counts = Object.fromEntries(topicDefs.map((t) => [t.id, { questions: 0, papers: 0 }]));
      for (const paper of outPapers) {
        const seen = new Set();
        for (const question of paper.questions) {
          for (const id of question.topics) {
            if (!counts[id]) counts[id] = { questions: 0, papers: 0 };
            counts[id].questions++;
            if (!seen.has(id)) {
              counts[id].papers++;
              seen.add(id);
            }
          }
        }
      }

      await writeFile(
        new URL(`${unit.code}.json`, OUT_DIR),
        JSON.stringify({
          unit: unit.code,
          name: unit.name,
          subject: subject.key,
          subjectLabel: subject.label,
          generatedAt: catalog.generatedAt,
          papers: outPapers,
        }),
      );

      catalog.units[unit.code] = {
        code: unit.code,
        name: unit.name,
        subject: subject.key,
        papers: outPapers.length,
        questions: outPapers.reduce((n, p) => n + p.questions.length, 0),
        topics: topicDefs
          .map((t) => ({
            id: t.id,
            name: t.name,
            questions: counts[t.id]?.questions ?? 0,
            papers: counts[t.id]?.papers ?? 0,
          }))
          .filter((t) => t.questions > 0),
      };

      totals.papers += outPapers.length;
      totals.questions += catalog.units[unit.code].questions;
      totals.tagged += outPapers.reduce(
        (n, p) => n + p.questions.filter((q) => q.topics.length > 0).length,
        0,
      );
      console.log(
        `${unit.code}: ${outPapers.length} papers, ${catalog.units[unit.code].questions} questions, ${catalog.units[unit.code].topics.length} topics with matches`,
      );
    }
  }

  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `\nIndexed ${totals.papers} papers, ${totals.questions} questions (${totals.tagged} tagged, ${totals.questions - totals.tagged} untagged).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
