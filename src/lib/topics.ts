import topicsJson from "@/data/topics.json";
import notesPdfsJson from "@/data/notes-pdfs.json";
import topicalPapersJson from "@/data/topical-papers.json";
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
 * Revision notes PDFs — published by StudyHub IAL and deep-linked, never
 * re-hosted. Built by scripts/build-notes-pdfs.mjs; units without a
 * published pack simply have no entry.
 */
export interface NotesPdf {
  title: string;
  url: string;
  source: string;
}

interface NotesPdfsData {
  generatedAt: string;
  source: string;
  units: Record<string, NotesPdf[]>;
}

const notesData = notesPdfsJson as unknown as NotesPdfsData;

export const NOTES_PDFS_SOURCE = notesData.source;

export function notesPdfsOf(unitCode: string): NotesPdf[] {
  return notesData.units[unitCode.toUpperCase()] ?? [];
}

/**
 * Topical question packs — one PDF per specification topic, with a mark
 * scheme where StudyHub publishes one. Notes are deliberately not included
 * here; they live in notes-pdfs.json.
 */
export interface TopicalPackFile {
  label: string;
  kind: "qp" | "ms" | "scanned";
  url: string;
  source?: string;
}

export interface TopicalPackGroup {
  /** Where the packs come from; a unit can mix sources. */
  source: string;
  topic: string;
  files: TopicalPackFile[];
}

interface TopicalPapersData {
  generatedAt: string;
  source: string;
  units: Record<
    string,
    Array<{ topic: string; label: string; kind: TopicalPackFile["kind"]; url: string; source?: string }>
  >;
}

const topicalPapersData = topicalPapersJson as unknown as TopicalPapersData;

export const TOPICAL_PACKS_SOURCE = topicalPapersData.source;

/** Packs for a unit, grouped by topic (topics keep the build's ordering). */
export function topicalPacksOf(unitCode: string): TopicalPackGroup[] {
  const packs = topicalPapersData.units[unitCode.toUpperCase()] ?? [];
  const groups: TopicalPackGroup[] = [];
  for (const pack of packs) {
    const source = pack.source ?? "StudyHub IAL";
    const file = { label: pack.label, kind: pack.kind, url: pack.url, source };
    const group = groups.find((g) => g.source === source && g.topic === pack.topic);
    if (group) group.files.push(file);
    else groups.push({ source, topic: pack.topic, files: [file] });
  }
  return groups;
}

export function topicalQuestionSearchUrl(unit: TopicUnit, topicName: string): string {
  const q = `${unit.code} ${topicName} questions walkthrough IAL`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
