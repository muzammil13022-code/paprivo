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
  papers: TopicalPaper[];
}

/** "topics" matches question tags; "papers" takes whole papers by id. */
export type SelectionMode = "topics" | "papers";

/** Chooses the cover wording and the downloaded file name. */
export type BuildKind = "topical" | "mock";

export interface TopicalSelection {
  topics: string[];
  fromYear: number;
  toYear: number;
  sessions: string[];
  includeMarkSchemes: boolean;
  mode?: SelectionMode;
  /** Paper ids used by "papers" mode. */
  paperIds?: string[];
  /** Stop once the paper holds this many marks ("topics" mode only). */
  markTarget?: number;
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

/** Every question in `index` the selection asks for, in paper order. */
export function matchQuestions(index: TopicalUnitIndex, selection: TopicalSelection): TopicalMatch {
  const mode = selection.mode ?? "topics";
  const wanted = new Set(selection.topics);
  const sessions = new Set(selection.sessions);
  const paperIds = new Set(selection.paperIds ?? []);
  const papers: SelectedPaper[] = [];

  for (const paper of index.papers) {
    let questions: TopicalQuestion[];

    if (mode === "papers") {
      if (!paperIds.has(paper.id)) continue;
      questions = paper.questions;
    } else {
      if (paper.year < selection.fromYear || paper.year > selection.toYear) continue;
      if (sessions.size > 0 && !sessions.has(paper.session)) continue;
      questions = paper.questions.filter((q) => q.topics.some((t) => wanted.has(t)));
    }

    if (questions.length === 0) continue;
    papers.push({ paper, questions, pages: pagesOf(questions) });
  }

  papers.sort(
    (a, b) =>
      b.paper.year - a.paper.year ||
      sessionOrder(a.paper.session) - sessionOrder(b.paper.session) ||
      (b.paper.variant ?? "").localeCompare(a.paper.variant ?? ""),
  );

  // A mark target only makes sense for topic picks; a whole paper is taken whole.
  const target = mode === "topics" ? selection.markTarget ?? 0 : 0;
  return summarise(target > 0 ? capAtMarks(papers, target) : papers);
}

/**
 * Fill a paper up to `target` marks, newest question first, skipping any
 * question that no longer fits so small-mark questions close the gap instead of
 * pushing the total well past the target.
 */
function capAtMarks(papers: SelectedPaper[], target: number): SelectedPaper[] {
  const out: SelectedPaper[] = [];
  let left = target;

  for (const entry of papers) {
    const questions: TopicalQuestion[] = [];
    for (const question of entry.questions) {
      // Unreadable mark boundaries would otherwise drag whole pages in for free.
      if (question.marks <= 0) continue;
      if (question.marks <= left) {
        questions.push(question);
        left -= question.marks;
      }
      if (left <= 0) break;
    }
    if (questions.length > 0) {
      out.push({ paper: entry.paper, questions, pages: pagesOf(questions) });
    }
    if (left <= 0) break;
  }

  return out;
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
