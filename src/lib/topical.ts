/**
 * "Make a topical" / "Mock test" — data layer.
 *
 * The index (public/topical-data/<UNIT>.json, built by
 * scripts/build-topical-index.mjs) records, for every indexed past paper, the
 * exact pages each question occupies and the specification topics it was
 * tagged with. This module turns a selection into the list of papers and pages
 * that go into one PDF: either the questions on chosen topics, or whole papers
 * picked by id, optionally capped at a mark total so the result resembles a
 * real exam paper.
 *
 * Everything about the selection is decided here so the browser preview and the
 * server-side PDF build (src/lib/topical-pdf.ts) agree page for page.
 */

export interface TopicalQuestion {
  q: number;
  /** 1-based inclusive page range in the source question paper. */
  from: number;
  to: number;
  marks: number;
  topics: string[];
  /** Specification points, written `<topic>/<n>`; at most one per topic. */
  points: string[];
}

/** One line of a specification section, with the questions that match it. */
export interface TopicalSpecPoint {
  id: string;
  topic: string;
  name: string;
  questions: number;
  papers: number;
}

export interface TopicalPaper {
  id: string;
  session: string;
  year: number;
  variant: string | null;
  pages: number;
  qp: string;
  ms: string | null;
  /** True when several questions share a page (MCQ sections). */
  sharesPages?: boolean;
  questions: TopicalQuestion[];
}

export interface TopicalUnitIndex {
  unit: string;
  name: string;
  subject: string;
  subjectLabel: string;
  generatedAt: string;
  /** Specification points with at least one matching question. */
  points?: TopicalSpecPoint[];
  papers: TopicalPaper[];
}

/** "topics" matches question tags; "papers" takes whole papers by id. */
export type SelectionMode = "topics" | "papers";

/** Chooses the cover wording and the downloaded file name. */
export type BuildKind = "topical" | "mock";

export interface TopicalSelection {
  topics: string[];
  /** Specification points; a question on any selected point is included too. */
  points?: string[];
  fromYear: number;
  toYear: number;
  sessions: string[];
  includeMarkSchemes: boolean;
  mode?: SelectionMode;
  /** Paper ids used by "papers" mode. */
  paperIds?: string[];
  /** Stop once the paper holds this many marks ("topics" mode only). */
  markTarget?: number;
  /**
   * Most questions to take from one section or specification point, keyed by
   * its id. Anything missing takes everything it matches.
   */
  quotas?: Record<string, number>;
  kind?: BuildKind;
}

export interface SelectedPaper {
  paper: TopicalPaper;
  questions: TopicalQuestion[];
  /** Unique 1-based pages to copy, ascending. */
  pages: number[];
}

export interface TopicalMatch {
  papers: SelectedPaper[];
  questionCount: number;
  marks: number;
  pageCount: number;
  /** Papers where a selected question shares its page with another question. */
  sharedPagePapers: number;
}

/** One question the selection asks for, with the picks it answers. */
interface Hit {
  paper: TopicalPaper;
  question: TopicalQuestion;
  keys: string[];
}

/** Every question in `index` the selection asks for, in paper order. */
export function matchQuestions(index: TopicalUnitIndex, selection: TopicalSelection): TopicalMatch {
  const mode = selection.mode ?? "topics";
  const papers: SelectedPaper[] = [];

  if (mode === "papers") {
    const paperIds = new Set(selection.paperIds ?? []);
    for (const paper of newestFirst(index.papers)) {
      if (!paperIds.has(paper.id)) continue;
      papers.push({ paper, questions: paper.questions, pages: pagesOf(paper.questions) });
    }
    return summarise(papers);
  }

  const wanted = new Set(selection.topics);
  const wantedPoints = new Set(selection.points ?? []);
  const sessions = new Set(selection.sessions);
  // Sections first, then single points; that order decides who is served first
  // when a mark target cannot be filled exactly.
  const keys = [...selection.topics, ...(selection.points ?? [])];

  const hits: Hit[] = [];
  for (const paper of newestFirst(index.papers)) {
    if (paper.year < selection.fromYear || paper.year > selection.toYear) continue;
    if (sessions.size > 0 && !sessions.has(paper.session)) continue;
    for (const question of paper.questions) {
      // Sections and single points add up: a student may take three whole
      // sections and one point from a fourth.
      const hitKeys = [
        ...question.topics.filter((t) => wanted.has(t)),
        ...(question.points ?? []).filter((p) => wantedPoints.has(p)),
      ];
      if (hitKeys.length > 0) hits.push({ paper, question, keys: hitKeys });
    }
  }

  let chosen = applyQuotas(hits, keys, selection.quotas ?? {});
  const target = selection.markTarget ?? 0;
  if (target > 0) chosen = fillToMarks(chosen, keys, target);

  // One entry per paper, questions in the order they are printed.
  const byPaper = new Map<string, SelectedPaper>();
  for (const hit of chosen) {
    let entry = byPaper.get(hit.paper.id);
    if (!entry) {
      entry = { paper: hit.paper, questions: [], pages: [] };
      byPaper.set(hit.paper.id, entry);
      papers.push(entry);
    }
    entry.questions.push(hit.question);
  }
  for (const entry of papers) entry.pages = pagesOf(entry.questions);

  return summarise(papers);
}

/** Newest sitting first, then January → June → October, then variant. */
function newestFirst(papers: TopicalPaper[]): TopicalPaper[] {
  return [...papers].sort(
    (a, b) =>
      b.year - a.year ||
      sessionOrder(a.session) - sessionOrder(b.session) ||
      (b.variant ?? "").localeCompare(a.variant ?? ""),
  );
}

/**
 * Applies the per-section counts. Picks are spread across sittings — newest
 * paper first, then the next paper — so a count of 2 means two different
 * papers rather than two neighbouring questions from one. Anything without a
 * count is taken whole.
 */
function applyQuotas(hits: Hit[], keys: string[], quotas: Record<string, number>): Hit[] {
  const capped = keys.filter((key) => quotas[key] !== undefined);
  if (capped.length === 0) return hits;

  const open = new Set(keys.filter((key) => quotas[key] === undefined));
  const keep = new Set<Hit>();
  for (const hit of hits) {
    if (hit.keys.some((key) => open.has(key))) keep.add(hit);
  }

  for (const key of capped) {
    const quota = Math.max(0, Math.floor(quotas[key]));
    let have = 0;
    for (const hit of keep) if (hit.keys.includes(key)) have += 1;
    if (have >= quota) continue;
    // Unreadable mark boundaries would drag a whole article page in for free.
    const spread = spreadByPaper(
      hits.filter((hit) => hit.keys.includes(key) && !keep.has(hit) && hit.question.marks > 0),
    );
    for (const hit of spread) {
      if (have >= quota) break;
      keep.add(hit);
      have += 1;
    }
  }

  return hits.filter((hit) => keep.has(hit));
}

/** Round-robins questions across papers, newest paper first. */
function spreadByPaper(hits: Hit[]): Hit[] {
  const groups = new Map<string, Hit[]>();
  for (const hit of hits) {
    const list = groups.get(hit.paper.id) ?? [];
    list.push(hit);
    groups.set(hit.paper.id, list);
  }
  const lists = [...groups.values()];
  const out: Hit[] = [];
  for (let i = 0; ; i += 1) {
    let added = false;
    for (const list of lists) {
      if (i < list.length) {
        out.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

/**
 * Fills `target` marks evenly across the picks. Each round serves the pick with
 * the fewest marks so far, taking the first question that still fits, so one
 * big section cannot swallow the paper and a question that would overshoot is
 * skipped in favour of a smaller one.
 */
function fillToMarks(hits: Hit[], keys: string[], target: number): Hit[] {
  const pool = new Map<string, Hit[]>();
  for (const key of keys) pool.set(key, []);
  for (const hit of hits) {
    for (const key of hit.keys) pool.get(key)?.push(hit);
  }

  const taken = new Set<Hit>();
  const marksOf = (key: string) =>
    (pool.get(key) ?? []).reduce((n, hit) => (taken.has(hit) ? n + hit.question.marks : n), 0);
  let left = target;

  for (;;) {
    const order = [...keys].sort((a, b) => marksOf(a) - marksOf(b));
    let added = false;
    for (const key of order) {
      if (left <= 0) break;
      const fit = (pool.get(key) ?? []).find(
        (hit) => !taken.has(hit) && hit.question.marks > 0 && hit.question.marks <= left,
      );
      if (!fit) continue;
      taken.add(fit);
      left -= fit.question.marks;
      added = true;
    }
    if (!added || left <= 0) break;
  }

  return hits.filter((hit) => taken.has(hit));
}

function summarise(papers: SelectedPaper[]): TopicalMatch {
  return {
    papers,
    questionCount: papers.reduce((n, p) => n + p.questions.length, 0),
    marks: papers.reduce((n, p) => n + p.questions.reduce((m, q) => m + q.marks, 0), 0),
    pageCount: papers.reduce((n, p) => n + p.pages.length, 0),
    sharedPagePapers: papers.filter((p) => p.questions.some((q) => isShared(p, q))).length,
  };
}

function isShared(selected: SelectedPaper, question: TopicalQuestion): boolean {
  return selected.paper.questions.some(
    (other) => other.q !== question.q && other.from <= question.to && other.to >= question.from,
  );
}

function pagesOf(questions: TopicalQuestion[]): number[] {
  return [...new Set(questions.flatMap((q) => range(q.from, q.to)))].sort((a, b) => a - b);
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let p = from; p <= to; p++) out.push(p);
  return out;
}

function sessionOrder(session: string): number {
  return session === "January" ? 0 : session === "June" ? 1 : 2;
}

/** Total marks printed on a paper's questions. */
export function paperMarks(paper: TopicalPaper): number {
  return paper.questions.reduce((n, q) => n + q.marks, 0);
}

/** "WMA11 June 2024" / "WMA11 June 2024 (A)" */
export function paperLabel(paper: TopicalPaper): string {
  return `${paper.id.split("|")[0]} ${paper.session} ${paper.year}${
    paper.variant ? ` (${paper.variant})` : ""
  }`;
}

function tidy(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
}

export function topicalPackName(
  index: TopicalUnitIndex,
  topicNames: string[],
): string {
  const topics =
    topicNames.length <= 3 ? topicNames.join(", ") : `${topicNames.slice(0, 3).join(", ")} +${topicNames.length - 3} more`;
  return tidy(`Paprivo - ${index.subjectLabel} - ${index.name} (${index.unit}) - ${topics}`) + ".pdf";
}

/** "Paprivo - Mathematics - Pure Mathematics 1 (WMA11) - Mock test - 60 marks.pdf" */
export function mockTestName(index: TopicalUnitIndex, label: string): string {
  return tidy(`Paprivo - ${index.subjectLabel} - ${index.name} (${index.unit}) - Mock test - ${label}`) + ".pdf";
}
