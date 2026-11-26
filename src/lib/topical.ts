/**
 * "Make a topical" — data layer and PDF assembler.
 *
 * The index (public/topical-data/<UNIT>.json, built by
 * scripts/build-topical-index.mjs) records, for every indexed past paper, the
 * exact pages each question occupies and the specification topics it was
 * tagged with. This module turns a topic + year + session selection into one
 * PDF: a cover sheet, the question pages themselves, and — when asked for —
 * the mark scheme for each paper used.
 *
 * Everything runs in the browser: the papers are pulled through the same
 * /api/doc gateway the rest of the site uses, and pdf-lib copies the selected
 * pages into a new document. Nothing is generated on the server.
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

export interface TopicalSelection {
  topics: string[];
  fromYear: number;
  toYear: number;
  sessions: string[];
  includeMarkSchemes: boolean;
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

/** Every question in `index` whose tags intersect the selection. */
export function matchQuestions(index: TopicalUnitIndex, selection: TopicalSelection): TopicalMatch {
  const wanted = new Set(selection.topics);
  const sessions = new Set(selection.sessions);
  const papers: SelectedPaper[] = [];

  for (const paper of index.papers) {
    if (paper.year < selection.fromYear || paper.year > selection.toYear) continue;
    if (sessions.size > 0 && !sessions.has(paper.session)) continue;
    const questions = paper.questions.filter((q) => q.topics.some((t) => wanted.has(t)));
    if (questions.length === 0) continue;
    const pages = [
      ...new Set(questions.flatMap((q) => range(q.from, q.to))),
    ].sort((a, b) => a - b);
    papers.push({ paper, questions, pages });
  }

  papers.sort(
    (a, b) =>
      b.paper.year - a.paper.year ||
      sessionOrder(a.paper.session) - sessionOrder(b.paper.session) ||
      (b.paper.variant ?? "").localeCompare(a.paper.variant ?? ""),
  );

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

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let p = from; p <= to; p++) out.push(p);
  return out;
}

function sessionOrder(session: string): number {
  return session === "January" ? 0 : session === "June" ? 1 : 2;
}

/** "WMA11 June 2024" / "WMA11 June 2024 (A)" */
export function paperLabel(paper: TopicalPaper): string {
  return `${paper.id.split("|")[0]} ${paper.session} ${paper.year}${
    paper.variant ? ` (${paper.variant})` : ""
  }`;
}

export function topicalPackName(
  index: TopicalUnitIndex,
  topicNames: string[],
): string {
  const topics =
    topicNames.length <= 3 ? topicNames.join(", ") : `${topicNames.slice(0, 3).join(", ")} +${topicNames.length - 3} more`;
  const tidy = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return tidy(`Paprivo - ${index.subjectLabel} - ${index.name} (${index.unit}) - ${topics}`) + ".pdf";
}
