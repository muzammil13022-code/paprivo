import { SUBJECTS, SUBJECT_ORDER, type SubjectKey } from "@/lib/subjects";
import { topicUnitsOf } from "@/lib/topics";
import { videoSectionsOf, type TopicVideo } from "@/lib/videos";

/**
 * Video search — data layer.
 *
 * Builds a flat index of every verified video in videos.json (subject, unit,
 * specification topic section, title, channel) and matches loose student input
 * against it. Like the question search, it only ever links to real entries in
 * the library, never to a guessed video id.
 */

export interface VideoHit {
  subjectKey: SubjectKey;
  subjectLabel: string;
  unitCode: string;
  unitName: string;
  sectionName: string;
  sectionSlug: string;
  video: TopicVideo;
  score: number;
  matchedOn: string[];
}

type VideoRow = Omit<VideoHit, "score" | "matchedOn">;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "the",
  "to",
  "video",
  "videos",
  "with",
]);

let indexCache: VideoRow[] | null = null;

function videoIndex(): VideoRow[] {
  if (indexCache) return indexCache;
  const rows: VideoRow[] = [];
  for (const key of SUBJECT_ORDER) {
    const subject = SUBJECTS[key];
    for (const unit of topicUnitsOf(key)) {
      for (const section of videoSectionsOf(unit.code)) {
        for (const video of section.videos) {
          rows.push({
            subjectKey: key,
            subjectLabel: subject.label,
            unitCode: unit.code,
            unitName: unit.name,
            sectionName: section.name,
            sectionSlug: section.slug,
            video,
          });
        }
      }
    }
  }
  indexCache = rows;
  return rows;
}

function tokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** The unit code with its two halves split, so "wch 11" still matches WCH11. */
function codeVariants(code: string): string {
  return `${code.toLowerCase()} ${code.slice(0, 3).toLowerCase()} ${code.slice(3)}`;
}

function scoreRow(row: VideoRow, words: string[]): { score: number; matchedOn: string[] } {
  const section = row.sectionName.toLowerCase();
  const unit = row.unitName.toLowerCase();
  const title = row.video.t.toLowerCase();
  const channel = row.video.c.toLowerCase();
  const code = codeVariants(row.unitCode);

  let score = 0;
  const matchedOn: string[] = [];

  for (const word of words) {
    if (code.includes(word)) score += 6;
    else if (section.includes(word)) score += 4;
    else if (title.includes(word)) score += 3;
    else if (unit.includes(word)) score += 2;
    else if (channel.includes(word)) score += 1;
    else return { score: 0, matchedOn: [] }; // every word has to land
  }

  // Shorter section names are more specific, so nudge exact topic hits up.
  if (words.length > 0 && section.split(" ").length <= words.length + 3) score += 1;
  matchedOn.push(row.unitCode);
  return { score, matchedOn };
}

/**
 * Search the video library. When `subject` is given only that subject's videos
 * are searched (used by the per-subject video page).
 */
export function searchVideos(
  raw: string,
  options: { subject?: SubjectKey; limit?: number } = {},
): VideoHit[] {
  const words = tokens(raw);
  if (words.length === 0) return [];
  const limit = options.limit ?? 8;

  const hits: VideoHit[] = [];
  for (const row of videoIndex()) {
    if (options.subject && row.subjectKey !== options.subject) continue;
    const { score, matchedOn } = scoreRow(row, words);
    if (score > 0) hits.push({ ...row, score, matchedOn });
  }

  return hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.subjectLabel.localeCompare(b.subjectLabel) ||
        a.unitCode.localeCompare(b.unitCode) ||
        a.video.t.localeCompare(b.video.t),
    )
    .slice(0, limit);
}

export function videoSearchExamples(subject?: SubjectKey): string[] {
  switch (subject) {
    case "chemistry":
      return ["titration", "acid base equilibria", "WCH12 energetics"];
    case "physics":
      return ["projectile motion", "capacitors", "WPH14 circular motion"];
    case "biology":
      return ["mitosis", "gas exchange", "WBI11 molecules"];
    case "mathematics":
      return ["vectors", "integration", "WMA12 sequences"];
    default:
      return ["integration", "titration", "momentum", "gene expression"];
  }
}
