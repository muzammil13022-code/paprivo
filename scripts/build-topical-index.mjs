/**
 * Build the topical question index — Paprivo's own version of Auto Topical's
 * `index/<paper>.json` + `syllabus/<code>.json` pair.
 *
 * Inputs (all already in the repo):
 *   src/data/papers.json            the catalogue
 *   src/data/question-pages.json    answer-booklet "Question N continued" pages
 *   .cache-question-pages/*.txt     per-page text of every question paper
 *   src/data/topical-topics.json    specification topics + question-text cues
 *   src/data/topical-points.json    the points inside each topic, with their own cues
 *
 * Question boundaries come from the most reliable evidence a paper offers:
 *
 *  1. Pearson's "(Total for Question 3 = 1 mark)" line, which ends every
 *     question and gives its marks;
 *  2. question numbers printed at the start of a line ("1. Find …", "3 The
 *     diagram shows …"), allowing for control characters some PDFs leave after
 *     the number;
 *  3. the answer booklet's "Question N continued" pages.
 *
 * The first source that gives a clean ascending run 1..N decides N; page starts
 * from (2) and ends from (1) are then combined, so a paper missing one printed
 * number is still segmented. A paper is dropped only when no source agrees.
 *
 * Output: public/topical-data/<UNIT>.json for the builder UI, plus
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
const POINTS = new URL("../src/data/topical-points.json", import.meta.url);
const CACHE = new URL("../.cache-question-pages/", import.meta.url);
const OUT_DIR = new URL("../public/topical-data/", import.meta.url);
const CATALOG = new URL("../src/data/topical-catalog.json", import.meta.url);

const DEFAULT_WEIGHT = 2;
const DEFAULT_MIN = 4;
// A point is narrower than its section, so one clear cue is usually enough.
const DEFAULT_POINT_MIN = 2;
const MAX_TOPICS_PER_QUESTION = 2;
// A question often covers more than one line of a section, so a point is not
// exclusive; it still stays narrower than the section it belongs to.
const MAX_POINTS_PER_SECTION = 3;
const MAX_QUESTION_PAGES = 14;

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

/**
 * One section = one specification heading, and each of its points is a line of
 * that heading. Point ids read "<topic>/<n>", n following specification order.
 */
function preparePoints(byTopic, defaultMin) {
  const out = [];
  for (const [topicId, points] of Object.entries(byTopic ?? {})) {
    points.forEach((point, index) => {
      out.push({
        id: `${topicId}/${index + 1}`,
        topic: topicId,
        name: point.name,
        min: typeof point.min === "number" ? point.min : defaultMin ?? DEFAULT_POINT_MIN,
        cues: (point.cues ?? []).map(compileCue),
      });
    });
  }
  return out;
}

/**
 * Points are narrower than their section but not exclusive: a question that
 * both plans an experiment and estimates its uncertainty belongs to both. The
 * three best-scoring points of a section are kept, so a stray cue cannot drag a
 * question into the whole section's worth of points.
 */
function tagPoints(text, points, allowedTopics) {
  const byTopic = new Map();
  for (const point of points) {
    // A point belongs to its section, so a question can only take points from
    // the sections it was tagged with. Without this a cue like "sketch" makes
    // every graph question part of the quadratics section.
    if (allowedTopics && !allowedTopics.has(point.topic)) continue;
    let score = 0;
    for (const cue of point.cues) if (cue.re.test(text)) score += cue.weight;
    if (score < point.min) continue;
    const list = byTopic.get(point.topic) ?? [];
    list.push({ id: point.id, score });
    byTopic.set(point.topic, list);
  }
  return [...byTopic.values()].flatMap((list) =>
    list
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_POINTS_PER_SECTION)
      .map((p) => p.id),
  );
}

const flatten = (text) => text.toLowerCase().replace(/\s+/g, " ");

/**
 * A few older papers print their body in a font whose glyphs sit 29 code points
 * below ASCII: "Find" extracts as ")LQG" and a space as ETX (\u0003). Decoding
 * a whole paper would wreck the pages that extract normally, so decoding is a
 * fallback: only a question the normal reading leaves untagged and that carries
 * several shifted spaces is re-read through the decoder.
 */
const SHIFT = 29;
const unshift = (text) => text.replace(/[\u0000-\u0061]/g, (c) => String.fromCharCode(c.charCodeAt(0) + SHIFT));
const shiftedSpaces = (text) => (text.match(/\u0003/g) ?? []).length;
/** Whitespace first, so shifting does not turn line breaks into quotes; case after. */
const decodedText = (text) => unshift(text.replace(/\s+/g, " ")).toLowerCase();

/**
 * The section a question's own wording points at most strongly, even when it
 * falls short of that section's threshold. Used only as a second opinion.
 */
function bestTopic(text, topics) {
  let best = null;
  for (const topic of topics) {
    let score = 0;
    for (const cue of topic.cues) if (cue.re.test(text)) score += cue.weight;
    if (score > 0 && (!best || score > best.score)) best = { id: topic.id, score };
  }
  return best?.id ?? null;
}

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

/** "… (Total for Question 3 = 1 mark)" → marks and the page each question ends on. */
const TOTAL_RE = /\(Total for Question\s+(\d+)\s*(?:is|=|:)\s*(\d+)\s*marks?\)/gi;
const OLD_TOTAL_RE = /\(Total\s+(\d{1,2})\s+marks?\)/gi;

function totalsIn(pages) {
  const marks = new Map();
  const endsOn = new Map();
  const sequential = []; // older papers print "(Total 5 marks)" with no number
  pages.forEach((pageText, index) => {
    // Totals are sometimes split over two lines by the text layer.
    const text = pageText.replace(/\s+/g, " ");
    for (const m of text.matchAll(TOTAL_RE)) {
      const q = Number(m[1]);
      if (!endsOn.has(q)) endsOn.set(q, index + 1);
      marks.set(q, Number(m[2]));
    }
    for (const m of text.matchAll(OLD_TOTAL_RE)) sequential.push({ page: index + 1, marks: Number(m[1]) });
  });
  return { marks, endsOn, sequential };
}

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;
const tidy = (line) => line.replace(CONTROL, " ").trim();

/**
 * Where each question number is printed: its page and its character offset in
 * that page's text. The offset matters because plenty of papers print several
 * questions on one page (multiple-choice sections especially); without it a
 * question's text starts at the top of the page and reads its neighbours'.
 */
function lineMarkers(pages) {
  const candidates = new Map();
  pages.forEach((text, index) => {
    let offset = 0;
    for (const raw of text.split("\n")) {
      const line = tidy(raw);
      // A question number is followed by a full stop or whitespace — not by an
      // algebraic term, which would make "2x2 – xy = 8" look like question 2.
      // Some papers prefix a question with an asterisk ("*18 Fuel cells are …").
      const m = /^\*?(\d{1,2})(?!\d)(\.\s*|\s+|\)\s*)(\S.*)$/.exec(line);
      const q = m ? Number(m[1]) : 0;
      const separator = m ? m[2].trim() : "";
      const rest = m ? m[3] : "";
      const letters = (rest.match(/\p{L}/gu) ?? []).length;
      // "9 cos3 θ – …" is a formula, "2 500 N" a data cell; a real question
      // follows its number with a full stop, a bracket, or ordinary prose.
      const looksLikeQuestion =
        q >= 1 &&
        q <= 30 &&
        (separator !== "" || /^[A-Z(\u201c\u2018"]/.test(rest) || (letters >= 3 && /^\d/.test(rest)));
      if (looksLikeQuestion) {
        if (!candidates.has(q)) candidates.set(q, []);
        candidates.get(q).push({ page: index + 1, index: offset + (raw.length - raw.trimStart().length) });
      }
      offset += raw.length + 1;
    }
  });

  // Questions are printed in order, so take each number's earliest position
  // that still follows the previous question. The comparison is by page and
  // then by offset within the page, so several questions on one page are all
  // registered instead of only the first. A stray label cannot hide a real one.
  const marks = new Map();
  let previous = { page: 0, index: 0 };
  for (const q of [...candidates.keys()].sort((a, b) => a - b)) {
    const mark = candidates
      .get(q)
      .filter((m) => m.page > previous.page || (m.page === previous.page && m.index > previous.index))
      .sort((a, b) => a.page - b.page || a.index - b.index)[0];
    if (!mark) continue;
    marks.set(q, mark);
    previous = mark;
  }
  return marks;
}

/**
 * One question's own text. A page that carries several question numbers is cut
 * at the next number, so a question never includes the start of the one printed
 * below it (their totals, marks and vocabulary used to leak into each other).
 */
function questionText(pages, q, from, to, marks) {
  const start = marks.get(q);
  const startIndex = start && start.page === from ? start.index : 0;
  // Only a later question can end this one; a smaller number printed further
  // down a page is a data label, not the next question.
  const nextMark = [...marks.entries()]
    .filter(([other, mark]) => other > q && mark.page === to && mark.index > (from === to ? startIndex : -1))
    .sort((a, b) => a[1].index - b[1].index)[0];
  const endIndex = nextMark ? nextMark[1].index : null;
  if (from === to) {
    const page = pages[from - 1];
    return page.slice(startIndex, endIndex ?? page.length);
  }
  const head = pages[from - 1].slice(startIndex);
  const tailPage = pages[to - 1];
  return [head, ...pages.slice(from, to - 1), tailPage.slice(0, endIndex ?? tailPage.length)].join("\n");
}

/** Question pages derived from the booklet's "Question N continued" pages. */
function markersOf(map) {
  if (!map) return null;
  const nums = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (nums.length < 2 || !nums.every((n, i) => n === i + 1)) return null;
  for (let i = 1; i < nums.length; i++) if (map[String(nums[i])] <= map[String(nums[i - 1])]) return null;
  return map;
}

function cleanBody(text) {
  return text
    .replace(CONTROL, " ")
    .replace(/_{5,}/g, " ")
    .replace(/DO NOT WRITE IN THIS AREA/gi, " ")
    .replace(/Question\s+\d+\s*continued/gi, " ")
    .replace(/\(Total for Question[^)]*\)/gi, " ")
    .replace(/Turn over/gi, " ")
    .replace(/\*P[0-9A-Z]+\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Questions 1..N, allowing a couple of totals that never made it into the text layer. */
const isRun = (nums) =>
  nums.length >= 2 && nums[0] === 1 && nums.every((n, i) => i === 0 || n > nums[i - 1]) && nums[nums.length - 1] - nums.length < 3;
const ascending = (map) => [...map.keys()].sort((a, b) => a - b);

/** Marks from "(Total 5 marks)" or part marks — "(2)" on its own line. */
function partMarks(text) {
  const old = /\(Total\s+(\d{1,2})\s+marks?\)/i.exec(text);
  if (old) return Number(old[1]);
  let sum = 0;
  for (const m of text.matchAll(/(?:^|\n)\s*\((\d{1,2})\)\s*(?:\n|$)/g)) sum += Number(m[1]);
  return Math.min(sum, 30);
}

function buildRanges(pages, evidence, n) {
  const { starts, endsOn, markers } = evidence;
  const total = pages.length;
  const ranges = [];
  let previousEnd = 0;

  for (let q = 1; q <= n; q++) {
    let end = endsOn.get(q) ?? null;
    if (end === null || end > total) {
      const nextStart = starts.get(q + 1);
      const nextMarker = markers?.[String(q)];
      const nextTotal = [...endsOn.entries()]
        .filter(([other]) => other > q)
        .reduce((min, [, page]) => Math.min(min, page), Infinity);
      const limits = [
        nextStart ? nextStart - 1 : null,
        nextMarker ? nextMarker - 1 : null,
        Number.isFinite(nextTotal) ? nextTotal - 1 : null,
      ].filter((v) => typeof v === "number" && v > 0);
      end = limits.length ? Math.min(...limits) : total;
    }
    end = Math.min(Math.max(end, 1), total);

    let start = starts.get(q) ?? null;
    if (start !== null && (start < 1 || start > end)) start = null;
    if (start === null) {
      if (previousEnd === 0) start = Math.min(end, 2);
      else if (previousEnd < end) start = previousEnd + 1;
      else start = previousEnd;
    }
    // A number printed before the previous question finished is a stray label.
    if (start !== null && start < previousEnd) start = previousEnd;
    start = Math.min(Math.max(start, 1), end);
    // Never open a question on a blank ruling page.
    while (start < end && cleanBody(pages[start - 1]).length < 40) start++;

    ranges.push({ q, from: start, to: end });
    previousEnd = end;
  }

  // Never end a question on blank ruling pages (usually the last one).
  const last = ranges[ranges.length - 1];
  while (last.to > last.from && cleanBody(pages[last.to - 1]).length < 40) last.to--;
  return ranges;
}

function rangeProblem(ranges, pages) {
  if (ranges.length < 2) return "fewer than two questions";
  let previousEnd = 0;
  for (const r of ranges) {
    if (r.from < 1 || r.to > pages.length || r.from > r.to) return `q${r.q} outside 1..${pages.length} (${r.from}-${r.to})`;
    if (r.from < previousEnd) return `q${r.q} starts before previous end (${r.from} < ${previousEnd})`;
    if (r.to - r.from + 1 > MAX_QUESTION_PAGES) return `q${r.q} spans ${r.to - r.from + 1} pages`;
    if (cleanBody(pages[r.from - 1]).length < 20) return `q${r.q} starts on an empty page ${r.from}`;
    previousEnd = r.to;
  }
  return null;
}

/** Segment one paper, trying totals → printed numbers → booklet headers. */
function segmentPaper(pages, lineMarks, markerMap) {
  const starts = new Map([...lineMarks].map(([q, mark]) => [q, mark.page]));
  const { marks, endsOn, sequential } = totalsIn(pages);
  const markers = markersOf(markerMap);

  const candidates = [];
  const totalNums = ascending(endsOn);
  if (isRun(totalNums)) {
    // A section can end with a "TOTAL FOR SECTION C" line instead of totals per
    // question. Keep the questions the paper numbers after its last total.
    let n = totalNums[totalNums.length - 1];
    const lastTotalPage = endsOn.get(n) ?? 0;
    for (const q of ascending(starts)) {
      if (q !== n + 1) continue;
      const page = starts.get(q) ?? 0;
      if (page <= lastTotalPage) continue;
      // A blank page prints its number where a question number would sit.
      if (/blank page/i.test(pages[page - 1])) continue;
      if (cleanBody(pages[page - 1]).length < 20) continue;
      n = q;
    }
    candidates.push({ n, source: "totals" });
  }
  if (sequential.length >= 2) {
    const bySequence = new Map(sequential.map((entry, index) => [index + 1, entry.page]));
    // "(Total 5 marks)" papers carry no question number; trust the count when
    // the printed numbers agree with it. One stray figure label must not veto it.
    const plausible = ascending(starts).filter((q) => q <= sequential.length).length;
    if (plausible >= 2) {
      candidates.push({ n: sequential.length, source: "totals-count", endsOn: bySequence });
    }
  }
  const lineNums = ascending(starts);
  if (isRun(lineNums)) candidates.push({ n: lineNums[lineNums.length - 1], source: "numbers" });
  const markerNums = markers ? ascending(new Map(Object.entries(markers).map(([k, v]) => [Number(k), v]))) : [];
  if (isRun(markerNums)) candidates.push({ n: markerNums[markerNums.length - 1], source: "headers" });

  const seen = new Set();
  const usable = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.n)) continue;
    seen.add(candidate.n);
    const evidence = { starts, endsOn: candidate.endsOn ?? endsOn, markers };
    const ranges = buildRanges(pages, evidence, candidate.n);
    const problem = rangeProblem(ranges, pages);
    if (problem) {
      if (process.env.TOPICAL_DEBUG) console.log(`WHY ${candidate.source} n=${candidate.n}: ${problem}`);
      continue;
    }
    const questions = ranges.map(({ q, from, to }) => {
      const text = questionText(pages, q, from, to, lineMarks);
      return {
        q,
        from,
        to,
        marks: marks.get(q) || partMarks(text),
        topics: [],
        points: [],
      };
    });
    const result = { questions, source: candidate.source };
    // The total printed on the cover is the best judge of a boundary choice.
    if (statedTotal(pages) && questions.reduce((n, q) => n + q.marks, 0) === statedTotal(pages)) {
      return result;
    }
    usable.push(result);
  }
  return usable[0] ?? null;
}

/** "The total mark for this paper is 75" or "TOTAL FOR PAPER = 75 MARKS". */
function statedTotal(pages) {
  const head = pages.slice(0, 3).join(" ").replace(/\s+/g, " ");
  const m = /total mark for this paper is\s+(\d+)/i.exec(head);
  if (m) return Number(m[1]);
  const foot = pages.join(" ").replace(/\s+/g, " ");
  const closing = /total for paper\s*=\s*(\d+)\s*marks?/i.exec(foot);
  return closing ? Number(closing[1]) : null;
}

function hash(url) {
  return createHash("sha1").update(url).digest("hex");
}

/**
 * Trim what is not the paper: a second copy glued into the same PDF (it opens
 * with another candidate cover) and the reading insert some papers carry after
 * the last question.
 */
const INSERT_RE = /scientific article for use with question/i;
const COVER_RE = /please check the examination details|candidate surname/i;
const PAPER_CODE_RE = /\b(P\d{5}[A-Z])\b/;

/** Pearson prints its document code on every page; a different code is a new document. */
function paperCode(page) {
  const flat = page.replace(/\s+/g, " ");
  return PAPER_CODE_RE.exec(flat)?.[1] ?? null;
}

function trimDuplicate(pages) {
  // Only trim an insert that follows the last question: in some PDFs the text
  // layer puts the article pages first, and those must be left alone.
  const hasTotal = /\(Total for Question\s+\d+/i;
  const lastTotal = pages.reduce((last, page, index) => (hasTotal.test(page) ? index : last), -1);
  for (let i = Math.max(lastTotal + 1, 3); i < pages.length; i++) {
    if (INSERT_RE.test(pages[i])) return pages.slice(0, i);
  }
  // Some files bind the answer booklet after the question paper; its cover
  // starts the second document, and its question numbers would collide.
  const firstCode = pages.slice(0, 3).map(paperCode).find(Boolean) ?? null;
  for (let i = 3; i < pages.length; i++) {
    if (COVER_RE.test(pages[i])) return pages.slice(0, i);
    const code = paperCode(pages[i]);
    if (firstCode && code && code !== firstCode) return pages.slice(0, i);
  }
  return pages;
}

async function pageText(paper) {
  const cached = new URL(`${hash(paper.qp.url)}.txt`, CACHE);
  if (existsSync(cached)) {
    const raw = await readFile(cached, "utf8");
    const marker = "\f\fFIRST_PAGE_BREAK\f\f";
    const at = raw.indexOf(marker);
    if (at === -1) return null;
    return raw.slice(at + marker.length).split("\f");
  }
  if (paper.qp.url.startsWith("/")) {
    const file = new URL(`../public/${paper.qp.url.slice(1)}`, import.meta.url);
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
  const pointsData = JSON.parse(await readFile(POINTS, "utf8"));

  await mkdir(OUT_DIR, { recursive: true });

  // Optional: dump the exact text each question was tagged from, so cue work can
  // be measured against the same input the index used.
  const dump = process.env.TOPICAL_DUMP ? [] : null;

  const catalog = { generatedAt: new Date().toISOString(), units: {} };
  const totals = { papers: 0, questions: 0, tagged: 0, pointed: 0, points: 0 };
  const sources = { totals: 0, numbers: 0, headers: 0 };

  for (const subject of papersData.subjects) {
    for (const unit of subject.units) {
      const topicDefs = topicsData.units[unit.code];
      if (!topicDefs) continue;
      const topics = prepare({ ...topicsData, topics: topicDefs });
      const points = preparePoints(pointsData.units?.[unit.code], pointsData.defaultMin);

      const outPapers = [];
      for (const paper of unit.papers) {
        const debug = process.env.TOPICAL_DEBUG ? (msg) => console.log(`SKIP ${paperKey(paper)} ${msg}`) : null;
        if (!paper.qp?.url) {
          debug?.("no qp");
          continue;
        }
        const raw = await pageText(paper);
        let pages = raw ? trimDuplicate(raw) : null;
        if (!pages) {
          debug?.("no text");
          continue;
        }
        if (pages.length < 3) {
          debug?.(`short (${pages.length} pages)`);
          continue;
        }

        const markerMap = starts[paperKey(paper)]?.qp;
        let lineMarks = lineMarkers(pages);
        let segmented = segmentPaper(pages, lineMarks, markerMap);
        if (!segmented && raw && pages.length !== raw.length) {
          // The trim was wrong for this paper; index the whole file instead.
          pages = raw;
          lineMarks = lineMarkers(pages);
          segmented = segmentPaper(pages, lineMarks, markerMap);
        }
        if (!segmented) {
          const totals = totalsIn(pages);
          debug?.(
            `no boundaries: totals=[${ascending(totals.endsOn).join(",")}] numbers=[${ascending(lineStarts(pages)).join(",")}]`,
          );
          continue;
        }
        const { questions } = segmented;
        const texts = new Map();
        for (const question of questions) {
          const raw = questionText(pages, question.q, question.from, question.to, lineMarks);
          let text = flatten(raw);
          let ids = tagQuestion(text, topics);
          // Only a question the normal reading could not tag is worth decoding;
          // decoding an already-tagged one would let page-sharing text re-rank it.
          if (ids.length === 0 && shiftedSpaces(raw) >= 3) {
            text = decodedText(raw);
            ids = tagQuestion(text, topics);
          }
          question.topics = ids;
          texts.set(question, text);
        }

        // A question whose own wording fell just short of a section can still be
        // placed by its neighbours — but position alone was measured at 43-61%
        // accuracy, because papers mix topics. Where the neighbours agree on one
        // section and the question's own cues point at that same section, the
        // rule reproduced the existing tag 304 times out of 307, so that pair of
        // signals is what is used here.
        const own = new Map();
        for (const question of questions) {
          const text = texts.get(question) ?? "";
          own.set(question, bestTopic(text, topics));
        }
        const taggedBefore = questions.map((q) => [...q.topics]);
        questions.forEach((question, index) => {
          if (question.topics.length > 0 || question.marks < 2) return;
          const before = taggedBefore[index - 1] ?? [];
          const after = taggedBefore[index + 1] ?? [];
          const shared = before.filter((id) => after.includes(id));
          if (shared.length !== 1) return;
          if (own.get(question) !== shared[0]) return;
          question.topics = [shared[0]];
        });

        for (const question of questions) {
          const text = texts.get(question) ?? "";
          // Points are read from the same text as the section tags so the two
          // levels agree; an untagged question belongs to no point either.
          question.points =
            question.topics.length > 0 && points.length > 0
              ? tagPoints(text, points, new Set(question.topics))
              : [];
          if (dump) {
            dump.push({
              unit: unit.code,
              paper: paperKey(paper),
              q: question.q,
              from: question.from,
              to: question.to,
              marks: question.marks,
              topics: question.topics,
              points: question.points,
              text: text.slice(0, 1800),
            });
          }
        }

        // A final section sometimes prints no per-question total. When exactly
        // one question is left without marks, the cover's paper total gives it.
        const stated = statedTotal(pages);
        if (stated) {
          let sum = questions.reduce((n, q) => n + q.marks, 0);
          if (sum === stated) {
            // The paper is fully accounted for: a trailing unmarked question is
            // a stray (a blank page's number, an article paragraph), not a mark.
            while (questions.length > 1 && !questions[questions.length - 1].marks) questions.pop();
          } else {
            const blanks = questions.filter((q) => !q.marks);
            if (blanks.length === 1) {
              const residual = stated - sum;
              if (residual > 0 && residual <= 30) blanks[0].marks = residual;
            }
          }
        }
        sources[segmented.source] = (sources[segmented.source] ?? 0) + 1;
        if (process.env.TOPICAL_DEBUG) console.log(`OK ${paperKey(paper)} ${segmented.source} n=${questions.length} [${questions.map((q) => q.from + "-" + q.to).join(",")}]`);

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
      const pointCounts = new Map();
      for (const paper of outPapers) {
        const seen = new Set();
        const seenPoints = new Set();
        for (const question of paper.questions) {
          for (const id of question.topics) {
            if (!counts[id]) counts[id] = { questions: 0, papers: 0 };
            counts[id].questions++;
            if (!seen.has(id)) {
              counts[id].papers++;
              seen.add(id);
            }
          }
          for (const id of question.points) {
            const entry = pointCounts.get(id) ?? { questions: 0, papers: 0 };
            entry.questions++;
            if (!seenPoints.has(id)) {
              entry.papers++;
              seenPoints.add(id);
            }
            pointCounts.set(id, entry);
          }
        }
      }

      const specPoints = points
        .map((p) => ({
          id: p.id,
          topic: p.topic,
          name: p.name,
          questions: pointCounts.get(p.id)?.questions ?? 0,
          papers: pointCounts.get(p.id)?.papers ?? 0,
        }))
        .filter((p) => p.questions > 0);

      await writeFile(
        new URL(`${unit.code}.json`, OUT_DIR),
        JSON.stringify({
          unit: unit.code,
          name: unit.name,
          subject: subject.key,
          subjectLabel: subject.label,
          generatedAt: catalog.generatedAt,
          points: specPoints,
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
      totals.pointed += outPapers.reduce(
        (n, p) => n + p.questions.filter((q) => q.points.length > 0).length,
        0,
      );
      totals.points += specPoints.length;
      console.log(
        `${unit.code}: ${outPapers.length} papers, ${catalog.units[unit.code].questions} questions, ${catalog.units[unit.code].topics.length} topics with matches, ${specPoints.length}/${points.length} spec points with matches`,
      );
    }
  }

  if (dump) await writeFile(process.env.TOPICAL_DUMP, JSON.stringify(dump));
  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `\nIndexed ${totals.papers} papers, ${totals.questions} questions (${totals.tagged} tagged, ${totals.questions - totals.tagged} untagged).`,
  );
  console.log(`Spec points: ${totals.points} with matches, ${totals.pointed} questions on a point`);
  console.log(`Boundaries from: ${JSON.stringify(sources)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
