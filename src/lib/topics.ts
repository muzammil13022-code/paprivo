import topicsJson from "@/data/topics.json";
import topicalPdfsJson from "@/data/topical-pdfs.json";
import type { SubjectKey } from "@/lib/subjects";

/**
 * Topical practice + revision notes data layer.
 *
 * Topic headings follow the Pearson Edexcel IAL (2018) specification.
 * Revision notes are Paprivo's own concise summaries. External topical
 * question banks are only linked where the target page was verified live
 * at seed time, mirroring the resources.json policy.
 */

export interface Topic {
  name: string;
  notes: string[];
}

export interface TopicUnit {
  code: string;
  name: string;
  short: string;
  /** 1–6 when the unit is numbered; sciences map from the code's unit digit. */
  unitNo: number;
  topics: Topic[];
}

interface SubjectTopicsRaw {
  label: string;
  units: Array<Omit<TopicUnit, "unitNo">>;
}

interface TopicsData {
  generatedAt: string;
  note: string;
  subjects: Record<SubjectKey, SubjectTopicsRaw>;
}

const data = topicsJson as unknown as TopicsData;

export const TOPIC_NOTE = data.note;

function withUnitNo(
  subject: SubjectKey,
  units: SubjectTopicsRaw["units"],
): TopicUnit[] {
  return units.map((u, i) => ({
    ...u,
    // Sciences: unit number equals the trailing digit (WPH12 → 2).
    // Mathematics: unit number is unused for links; fall back to position.
    unitNo: subject === "mathematics" ? i + 1 : Number(u.code.slice(-1)) || i + 1,
  }));
}

export function topicUnitsOf(subject: SubjectKey): TopicUnit[] {
  const raw = data.subjects[subject];
  if (!raw) return [];
  return withUnitNo(subject, raw.units);
}

export function topicUnitOf(subject: SubjectKey, unitCode: string): TopicUnit | undefined {
  return topicUnitsOf(subject).find((u) => u.code.toLowerCase() === unitCode.toLowerCase());
}

/**
 * Verified-live external topical question bank URL for a unit.
 * Physics/Chemistry/Biology have per-unit PMT pages; Mathematics links to
 * PMT's IAL maths paper hub (no per-unit topical equivalent exists there).
 */
export function topicalBankUrl(subject: SubjectKey, unit: TopicUnit): string {
  if (subject === "physics") {
    return `https://www.physicsandmathstutor.com/physics-revision/a-level-edexcel-ial/unit-${unit.unitNo}/`;
  }
  if (subject === "chemistry") {
    return `https://www.physicsandmathstutor.com/chemistry-revision/a-level-edexcel-ial/unit-${unit.unitNo}/`;
  }
  if (subject === "biology") {
    return `https://www.physicsandmathstutor.com/biology-revision/a-level-edexcel-ial/unit-${unit.unitNo}/`;
  }
  return "https://www.physicsandmathstutor.com/a-level-maths-papers/edexcel-maths-ial-papers/";
}

/**
 * Topical paper compilations for a unit — physical PDF files produced by
 * StudyHub IAL and served from their site; Paprivo deep-links to the
 * original files rather than hosting copies.
 */
export interface TopicalPaper {
  title: string;
  url: string;
}

interface TopicalPdfsData {
  generatedAt: string;
  source: string;
  units: Record<string, Array<{ t: string; u: string }>>;
}

const pdfsData = topicalPdfsJson as unknown as TopicalPdfsData;

export const TOPICAL_PAPERS_SOURCE = pdfsData.source;

const topicalPapersByUnit = new Map(
  Object.entries(pdfsData.units).map(([code, packs]) => [
    code,
    packs.map((p) => ({ title: p.t, url: p.u })),
  ]),
);

export function topicalPapersOf(unitCode: string): TopicalPaper[] {
  return topicalPapersByUnit.get(unitCode.toUpperCase()) ?? [];
}

export function topicalQuestionSearchUrl(unit: TopicUnit, topicName: string): string {
  const q = `${unit.code} ${topicName} questions walkthrough IAL`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function topicalReviewSearchUrl(unit: TopicUnit): string {
  const q = `${unit.code} ${unit.name} walkthrough IAL`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
