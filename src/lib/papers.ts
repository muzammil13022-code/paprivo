import { z } from "zod";
import { papersData } from "@/types";

export const SUBJECT_KEYS = ["mathematics", "physics", "chemistry", "biology", "computer-science"] as const;
export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const subjectKeysSchema = z.array(z.enum(SUBJECT_KEYS)).max(SUBJECT_KEYS.length);

/** Every real unit code in the catalogue (WMA11, WPH11, ...). */
const VALID_CODES = new Set(papersData.subjects.flatMap((s) => s.units.map((u) => u.code)));

/** Stable canonical string used for paper identity across client and DB. */
export function paperId(code: string, session: string, year: number, variant: string | null): string {
  return [code, session, String(year), variant ?? ""].join("|");
}

export function parsePaperId(
  id: string,
): { code: string; session: string; year: number; variant: string | null } | null {
  const parts = id.split("|");
  if (parts.length !== 4) return null;
  const [code, session, yearStr, variant] = parts;
  const year = Number(yearStr);
  if (
    !VALID_CODES.has(code) ||
    !(["January", "June", "October"] as string[]).includes(session) ||
    !Number.isInteger(year) ||
    year < papersData.yearMin ||
    year > papersData.yearMax
  ) {
    return null;
  }
  return { code, session, year, variant: variant || null };
}

/** Body for POST /api/progress and POST /api/bookmarks */
export const batchSchema = z.object({
  add: z.array(z.string()).max(3000).default([]),
  remove: z.array(z.string()).max(3000).default([]),
});

/** Body for POST /api/migrate — guest state promoted into a fresh account */
export const migrateSchema = z.object({
  subjectKeys: subjectKeysSchema,
  progress: z.array(z.string()).max(3000).default([]),
  bookmarks: z.array(z.string()).max(3000).default([]),
});

export const paperIdSchema = z.string().refine((s) => parsePaperId(s) !== null, "invalid paper id");
