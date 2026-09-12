import { papersData, type Subject } from "@/types";

export type Accent = "violet" | "blue" | "amber" | "green" | "cyan";

export interface SubjectMeta {
  key: SubjectKey;
  label: string;
  blurb: string;
  accent: Accent;
  glyph: string;
  unitsLine: string;
}

export const SUBJECT_ORDER = ["mathematics", "physics", "chemistry", "biology", "computer-science"] as const;
export type SubjectKey = (typeof SUBJECT_ORDER)[number];

export const SUBJECTS: Record<SubjectKey, SubjectMeta> = {
  mathematics: {
    key: "mathematics",
    label: "Mathematics",
    blurb: "Pure Mathematics 1 & 2, Mechanics 1 & 2, Statistics 1 & 2",
    accent: "violet",
    glyph: "∑",
    unitsLine: "P1, P2, M1, M2, S1, S2",
  },
  physics: {
    key: "physics",
    label: "Physics",
    blurb: "All six units, from Mechanics and Materials to Practical Skills II",
    accent: "blue",
    glyph: "λ",
    unitsLine: "Units 1–6 (WPH11–16)",
  },
  chemistry: {
    key: "chemistry",
    label: "Chemistry",
    blurb: "All six units, from Bonding to Transition Metals",
    accent: "amber",
    glyph: "Δ",
    unitsLine: "Units 1–6 (WCH11–16)",
  },
  biology: {
    key: "biology",
    label: "Biology",
    blurb: "All six units, from Molecules to Practical Skills II",
    accent: "green",
    glyph: "α",
    unitsLine: "Units 1–6 (WBI11–16)",
  },
  "computer-science": {
    key: "computer-science",
    label: "Computer Science",
    blurb: "New 2026 specification — first exams June 2027",
    accent: "cyan",
    glyph: "</>",
    unitsLine: "First exams 2027",
  },
};

export const subjectList: SubjectMeta[] = SUBJECT_ORDER.map((k) => SUBJECTS[k]);

export function isSubjectKey(key: string): key is SubjectKey {
  return (SUBJECT_ORDER as readonly string[]).includes(key);
}

export function catalogueSubject(key: SubjectKey): Subject | undefined {
  return papersData.subjects.find((s) => s.key === key);
}

export function paperCountOf(key: SubjectKey): number {
  const subject = catalogueSubject(key);
  if (!subject) return 0;
  return subject.units.reduce((n, u) => n + u.papers.length, 0);
}

export function totalPaperCount(): number {
  return papersData.subjects.reduce(
    (n, s) => n + s.units.reduce((m, u) => m + u.papers.length, 0),
    0,
  );
}

/** Official links shown for Computer Science (new spec, first exams 2027). */
export const CS_RESOURCES = {
  spec:
    "https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels/computer-science-2026.html",
  sample:
    "https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels/computer-science-2026.coursematerials.html",
} as const;
