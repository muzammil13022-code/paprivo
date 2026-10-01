/**
 * One-time merge into src/data/resources.json:
 *  1. External textbook links for Paprivo's subjects, taken from PaperLords'
 *     own public textbook listing (their URLs, their hosting — Paprivo never
 *     fetches or stores these PDFs). Source recorded; no license claimed.
 *  2. A self-generated CC0 demo book hosted at /textbooks/ to exercise the
 *     hosted-textbook pipeline end-to-end.
 *
 * Idempotent: re-running replaces its own previous entries.
 * Run: node scripts/add-textbooks.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/resources.json", import.meta.url);
const PL_LISTING = "https://www.paperlords.org/textbooks";
const ARCH = "https://archive.paperlords.org/textbooks/Edexcel/IAL";

const SUBJECT = {
  maths: "mathematics",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
};

// [subjectKey, slug, title, shortNote]
const BOOKS = [
  ["maths", "Pure_Mathematics_P1/P1__1777957642693.pdf", "Pearson Edexcel IAL Pure Mathematics 1 Student Book", "Pure Mathematics P1"],
  ["maths", "Pure_Mathematics_P2/P2_1777958093878.pdf", "Pearson Edexcel IAL Pure Mathematics 2 Student Book", "Pure Mathematics P2"],
  ["maths", "Pure_Mathematics_P3/P3_1777958636962.pdf", "Pearson Edexcel IAL Pure Mathematics 3 Student Book", "Pure Mathematics P3"],
  ["maths", "Pure_Mathematics_P4/P4_1777958784212.pdf", "Pearson Edexcel IAL Pure Mathematics 4 Student Book", "Pure Mathematics P4"],
  ["maths", "Mechanics_M1/New_Mathematics_Mechanics_1_1777960939333.pdf", "Pearson Edexcel IAL Mechanics 1 Student Book", "Mechanics M1"],
  ["maths", "Mechanics_M2/New_Mathematics_Mechanics_2_1777961955203.pdf", "Pearson Edexcel IAL Mechanics 2 Student Book", "Mechanics M2"],
  ["maths", "Mechanics_M3/New_Mathematics_Mechanics_3_1777962094587.pdf", "Pearson Edexcel IAL Mechanics 3 Student Book", "Mechanics M3"],
  ["maths", "Statistics_S1/New_Mathematics_Statistics_1_1777959417634.pdf", "Pearson Edexcel IAL Statistics 1 Student Book", "Statistics S1"],
  ["maths", "Statistics_S2/New_Mathematics_Statistics_2_1777959569566.pdf", "Pearson Edexcel IAL Statistics 2 Student Book", "Statistics S2"],
  ["maths", "Statistics_S3/Mathematics_Statistics_3_1777960586311.pdf", "Pearson Edexcel IAL Statistics 3 Student Book", "Statistics S3"],
  ["maths", "Decision_Mathematics_D1/New_Decision_Mathematics_1_1777962986657.pdf", "Pearson Edexcel IAL Decision Mathematics 1 Student Book", "Decision Mathematics D1"],
  ["maths", "Further_Pure_Mathematics_FP1/New_Further_Pure_Mathematics_1_1777962303851.pdf", "Pearson Edexcel IAL Further Pure Mathematics 1 Student Book", "Further Pure Mathematics FP1"],
  ["maths", "Further_Pure_Mathematics_FP2/New_Further_Pure_Mathematics_2_1777962434403.pdf", "Pearson Edexcel IAL Further Pure Mathematics 2 Student Book", "Further Pure Mathematics FP2"],
  ["maths", "Further_Pure_Mathematics_FP3/New_Further_Pure_Mathematics_3_1777962632168.pdf", "Pearson Edexcel IAL Further Pure Mathematics 3 Student Book", "Further Pure Mathematics FP3"],
  ["physics", "Physics/New_Physics_Student_Book_1_1777963194107.pdf", "Pearson Edexcel IAL Physics Student Book 1", "Student Book 1 of 2"],
  ["physics", "Physics/New_Physics_Student_Book_2_1777963328756.pdf", "Pearson Edexcel IAL Physics Student Book 2", "Student Book 2 of 2"],
  ["physics", "Physics/IAL_Physics_Lab_Book_1777963511040.pdf", "Pearson Edexcel IAL Physics Student Laboratory Book", "Laboratory book"],
  ["chemistry", "Chemistry/New_Chemistry_Student_Book_1_1777954724590.pdf", "Pearson Edexcel IAL Chemistry Student Book 1", "Student Book 1 of 2"],
  ["chemistry", "Chemistry/New_Chemistry_Student_Book_2_1777955242216.pdf", "Pearson Edexcel IAL Chemistry Student Book 2", "Student Book 2 of 2"],
  ["chemistry", "Chemistry/IAL_Chemistry_Lab_Book_1777956197878.pdf", "Pearson Edexcel IAL Chemistry Student Laboratory Book", "Laboratory book"],
  ["biology", "Biology/New_Biology_Student_Book_1_1777952702593.pdf", "Pearson Edexcel IAL Biology Student Book 1", "Student Book 1 of 2"],
  ["biology", "Biology/New_Biology_Student_Book_2_1777952997332.pdf", "Pearson Edexcel IAL Biology Student Book 2", "Student Book 2 of 2"],
  ["biology", "Biology/IAL_Biology_Lab_Book_1777953282256.pdf", "Pearson Edexcel IAL Biology Student Laboratory Book", "Laboratory book"],
];

function slugId(title) {
  return "res-tb-pl-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

const externalEntries = BOOKS.map(([subjectKey, slug, title, note]) => ({
  id: slugId(title),
  title,
  subject: SUBJECT[subjectKey],
  subjectCode: subjectKey === "maths" ? "WMA/WME/WST" : subjectKey === "physics" ? "WPH" : subjectKey === "chemistry" ? "WCH" : "WBI",
  level: "alevel",
  examBoard: "Edexcel",
  topic: null,
  resourceType: "textbook",
  year: null,
  session: null,
  paperNumber: null,
  variant: null,
  description: `Pearson's published IAL ${note} — hosted and served by PaperLords, a third-party study site. Paprivo links to it but does not host, copy or proxy the file.`,
  fileUrl: null,
  externalUrl: `${ARCH}/${slug}`,
  source: `PaperLords (third-party) — ${PL_LISTING}`,
  accessType: "external",
  license: null,
  originalSource: PL_LISTING,
}));

const demoEntry = {
  id: "res-tb-demo",
  title: "Paprivo Demo Textbook (pipeline test)",
  subject: "mathematics",
  subjectCode: null,
  level: "alevel",
  examBoard: "Paprivo",
  topic: null,
  resourceType: "textbook",
  year: 2026,
  session: null,
  paperNumber: null,
  variant: null,
  description:
    "A one-page book generated by Paprivo itself to demonstrate the hosted-textbook viewer: page navigation, zoom, fullscreen and open-in-new-tab. Serves as the template for genuinely redistributable textbooks; safe to delete.",
  fileUrl: "/textbooks/paprivo-demo-textbook.pdf",
  externalUrl: null,
  source: "Generated by Paprivo",
  accessType: "hosted",
  license: "CC0 1.0 (public domain, generated by Paprivo)",
  originalSource: "Generated by Paprivo — no third-party content",
};

const cat = JSON.parse(await readFile(FILE, "utf8"));
cat.resources = cat.resources.filter(
  (r) => !r.id.startsWith("res-tb-pl-") && r.id !== "res-tb-demo",
);
cat.resources.push(...externalEntries, demoEntry);
await writeFile(FILE, JSON.stringify(cat, null, 2) + "\n", "utf8");
console.log(
  `resources.json now has ${cat.resources.length} entries (${externalEntries.length} external textbooks + 1 hosted demo).`,
);
