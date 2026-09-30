import { papersData, type Paper } from "@/types";
import { SUBJECT_ORDER, SUBJECTS } from "@/lib/subjects";
import type { SubjectKey } from "@/lib/papers";

/**
 * Question Reference Search — data layer.
 *
 * Parses loose student input ("wma11/24 q3", "Chemistry WCH12 2023 question 5",
 * "WPH11 oct 2024 3") into a structured intent, then matches it against the
 * real Pearson catalogue (papers.json). It only ever links to documents that
 * exist in the catalogue — never fabricated URLs.
 *
 * The public functions here are the seam for a future real database/API:
 * swap the internals of searchQuestions for a fetch without touching the UI.
 */

export interface QuestionIntent {
  code: string | null; // unit code, e.g. WMA11
  subject: SubjectKey | null;
  session: "January" | "June" | "October" | null;
  year: number | null;
  variant: string | null;
  questionNumber: number | null;
}

export interface QuestionSearchHit {
  paper: Paper;
  unitCode: string;
  unitName: string;
  subjectKey: SubjectKey;
  subjectLabel: string;
  /** Score 0..1; 1 = perfect match on every specified field */
  score: number;
  /** Which parts of the intent matched, for display */
  matchedOn: string[];
}

export type QuestionSearchResult =
  | { status: "exact" | "partial"; intent: QuestionIntent; hits: QuestionSearchHit[] }
  | { status: "none"; intent: QuestionIntent; suggestions: string[] };

/* ------------------------- parser ------------------------- */

const SESSION_ALIASES: Record<string, "January" | "June" | "October"> = {
  jan: "January",
  january: "January",
  jun: "June",
  june: "June",
  "m/j": "June",
  may: "June",
  "may/jun": "June",
  "may/june": "June",
  summer: "June",
  oct: "October",
  october: "October",
  "o/n": "October",
  nov: "October",
  november: "October",
  "oct/nov": "October",
  winter: "October",
};

const SUBJECT_WORDS: Record<string, SubjectKey> = {
  maths: "mathematics",
  math: "mathematics",
  mathematics: "mathematics",
  pure: "mathematics",
  mechanics: "mathematics",
  stats: "mathematics",
  statistics: "mathematics",
  physics: "physics",
  chem: "chemistry",
  chemistry: "chemistry",
  bio: "biology",
  biology: "biology",
};

/** Two-digit year → full year within the catalogue range (2019–2026). */
function fullYear(n: number): number | null {
  if (n >= 2019 && n <= 2026) return n;
  if (n >= 19 && n <= 26) return 2000 + n;
  return null;
}

/**
 * Normalize a free-form query into a structured intent.
 * Understands: unit codes (WMA11), subject words, session abbreviations
 * (jan/jun/m-j/o-n/summer/winter), 2- or 4-digit years, variants (2P/3B),
 * and question numbers ("q3", "question 12", or a bare trailing number).
 */
export function parseQuestionQuery(raw: string): QuestionIntent {
  const intent: QuestionIntent = {
    code: null,
    subject: null,
    session: null,
    year: null,
    variant: null,
    questionNumber: null,
  };
  if (!raw) return intent;

  // Normalize separators: slashes, dashes, commas → spaces; collapse whitespace.
  let text = ` ${raw.toLowerCase().replace(/[/\\,;_]+/g, " ").replace(/\s+/g, " ").trim()} `;

  // Question number: "q3", "question 3", "qs 3", "q.3"
  const qMatch = text.match(/\b(?:qs?|question)s?\s*\.?\s*(\d{1,2})\b/);
  if (qMatch) {
    intent.questionNumber = Number(qMatch[1]);
    text = text.replace(qMatch[0], " ");
  }

  // Unit code: 3 letters + 2 digits (WMA11, WPH12, WCH13, WBI14, WST01/11/12...)
  const codeMatch = text.match(/\bw([a-z]{2})(\d{2})\b/);
  if (codeMatch) {
    intent.code = `W${codeMatch[1].toUpperCase()}${codeMatch[2]}`;
    text = text.replace(codeMatch[0], " ");
  }

  // Session words (check multi-word aliases first)
  for (const [alias, session] of Object.entries(SESSION_ALIASES)) {
    const re = new RegExp(`\\s${alias.replace("/", "\\s*/\\s*")}\\s`);
    if (re.test(text)) {
      intent.session = session;
      text = text.replace(re, " ");
      break;
    }
  }

  // Year: 4-digit or trailing 2-digit (e.g. "25", "2024")
  const y4 = text.match(/\b(20\d{2})\b/);
  if (y4) {
    intent.year = fullYear(Number(y4[1]));
    text = text.replace(y4[0], " ");
  } else {
    const y2 = text.match(/\b(\d{2})\b/);
    if (y2) {
      intent.year = fullYear(Number(y2[1]));
      if (intent.year !== null) text = text.replace(y2[0], " ");
    }
  }

  // Variant: remaining letter+digit pair like "2p", "3b" (unit has variants A–D)
  const vMatch = text.match(/\b(\d)([a-d])\b/);
  if (vMatch) {
    intent.variant = vMatch[2].toUpperCase();
    text = text.replace(vMatch[0], " ");
  }

  // Subject words — only fill subject if no explicit unit code contradicts it
  for (const [word, key] of Object.entries(SUBJECT_WORDS)) {
    if (new RegExp(`\\s${word}\\s`).test(text)) {
      intent.subject = key;
      break;
    }
  }

  return intent;
}

/* ------------------------- catalogue index ------------------------- */

interface PaperRow {
  subjectKey: SubjectKey;
  subjectLabel: string;
  unitCode: string;
  unitName: string;
  paper: Paper;
}

let indexCache: PaperRow[] | null = null;

function catalogueIndex(): PaperRow[] {
  if (indexCache) return indexCache;
  const rows: PaperRow[] = [];
  for (const subject of papersData.subjects) {
    const label = SUBJECT_ORDER.includes(subject.key as SubjectKey)
      ? SUBJECTS[subject.key as SubjectKey].label
      : subject.label;
    for (const unit of subject.units) {
      for (const paper of unit.papers) {
        rows.push({
          subjectKey: subject.key as SubjectKey,
          subjectLabel: label,
          unitCode: unit.code,
          unitName: unit.name,
          paper,
        });
      }
    }
  }
  indexCache = rows;
  return rows;
}

/* ------------------------- search ------------------------- */

const CODE_TO_SUBJECT: Record<string, SubjectKey> = {
  WMA: "mathematics",
  WME: "mathematics",
  WST: "mathematics",
  WPH: "physics",
  WCH: "chemistry",
  WBI: "biology",
};

function subjectOfCode(code: string): SubjectKey | null {
  return CODE_TO_SUBJECT[code.slice(0, 3)] ?? null;
}

/**
 * Search the catalogue for papers matching a parsed intent.
 * Exact = code (or subject+session+year) all matched and the paper exists.
 * Partial = some fields matched; used for "Did you mean?" suggestions.
 */
export function searchQuestions(intent: QuestionIntent): QuestionSearchResult {
  const specified: string[] = [];
  if (intent.code) specified.push("code");
  else if (intent.subject) specified.push("subject");
  if (intent.session) specified.push("session");
  if (intent.year !== null) specified.push("year");
  if (intent.variant) specified.push("variant");

  if (specified.length === 0) {
    return { status: "none", intent, suggestions: suggestionList() };
  }

  const subjectFilter = intent.code ? subjectOfCode(intent.code) : intent.subject;

  const scored = catalogueIndex()
    .map((row) => {
      if (subjectFilter && row.subjectKey !== subjectFilter) return null;

      let score = 0;
      let fields = 0;
      const matchedOn: string[] = [];

      if (intent.code) {
        fields++;
        if (row.unitCode === intent.code) {
          score++;
          matchedOn.push(row.unitCode);
        } else return null;
      } else if (intent.subject) {
        fields++;
        score += 0.25; // weaker signal than an exact unit code
      }

      if (intent.session) {
        fields++;
        if (row.paper.session === intent.session) {
          score++;
          matchedOn.push(row.paper.session);
        } else return null;
      }

      if (intent.year !== null) {
        fields++;
        if (row.paper.year === intent.year) {
          score++;
          matchedOn.push(String(intent.year));
        } else return null;
      }

      if (intent.variant) {
        fields++;
        if ((row.paper.variant ?? "") === intent.variant) {
          score++;
          matchedOn.push(`Variant ${intent.variant}`);
        } else return null;
      }

      return { row, ratio: score / fields, matchedOn };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.ratio - a.ratio || a.row.unitCode.localeCompare(b.row.unitCode));

  const toHit = (x: { row: PaperRow; ratio: number; matchedOn: string[] }): QuestionSearchHit => ({
    paper: x.row.paper,
    unitCode: x.row.unitCode,
    unitName: x.row.unitName,
    subjectKey: x.row.subjectKey,
    subjectLabel: x.row.subjectLabel,
    score: x.ratio,
    matchedOn: x.matchedOn,
  });

  if (scored.length > 0) {
    const hits = scored.slice(0, 8).map(toHit);
    return { status: "exact", intent, hits };
  }

  // Nothing matched all filters — relax year, then session, for "did you mean"
  const relaxed = catalogueIndex()
    .map((row) => {
      if (subjectFilter && row.subjectKey !== subjectFilter) return null;
      if (intent.code && row.unitCode !== intent.code) return null;
      if (!intent.code && intent.subject && row.subjectKey !== intent.subject) return null;
      let proximity = 0;
      if (intent.year !== null) {
        const gap = Math.abs(row.paper.year - intent.year);
        if (gap > 2) return null;
        proximity += 1 - gap * 0.34;
      }
      if (intent.session && row.paper.session === intent.session) proximity += 0.5;
      return { row, proximity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.proximity - a.proximity)
    .slice(0, 4);

  if (relaxed.length > 0) {
    return {
      status: "partial",
      intent,
      hits: relaxed.map((x) => ({
        ...toHit({ row: x.row, ratio: 0, matchedOn: [] }),
        score: 0,
      })),
    };
  }

  return { status: "none", intent, suggestions: suggestionList() };
}

function suggestionList(): string[] {
  return [
    "Unit code + session + year, e.g. WMA11 June 2024 Q3",
    "Subject + code + year, e.g. Chemistry WCH12 2023 Q5",
    "Short form, e.g. WPH11/24 Q2",
  ];
}

/** End-to-end helper: raw text → search result. */
export function findQuestion(raw: string): QuestionSearchResult {
  return searchQuestions(parseQuestionQuery(raw));
}
