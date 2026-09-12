/**
 * Generates data/papers.json by querying Pearson's public Algolia search index
 * (the same read-only search key every browser session uses on
 * qualifications.pearson.com). No credentials, no scraping of gated content.
 *
 * Usage: node scripts/fetch-papers.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "L639T95U5A";
const API_KEY = "f79c7a8352e9ffbdaec387bf43612ee6";
const INDEX = "qualifications-uk_LIVE_master-content";
const BASE = "https://qualifications.pearson.com";

const YEAR_MIN = 2019;
const YEAR_MAX = 2026;

const SUBJECTS = [
  {
    key: "mathematics",
    label: "Mathematics",
    units: [
      { code: "WMA11", name: "Pure Mathematics 1", short: "P1" },
      { code: "WMA12", name: "Pure Mathematics 2", short: "P2" },
      { code: "WME01", name: "Mechanics 1", short: "M1" },
      { code: "WME02", name: "Mechanics 2", short: "M2" },
      { code: "WST01", name: "Statistics 1", short: "S1" },
      { code: "WST02", name: "Statistics 2", short: "S2" },
    ],
  },
  {
    key: "physics",
    label: "Physics",
    units: [
      { code: "WPH11", name: "Mechanics and Materials", short: "Unit 1" },
      { code: "WPH12", name: "Waves and Electricity", short: "Unit 2" },
      { code: "WPH13", name: "Practical Skills in Physics I", short: "Unit 3" },
      { code: "WPH14", name: "Further Mechanics, Fields and Particles", short: "Unit 4" },
      { code: "WPH15", name: "Thermodynamics, Radiation and Oscillations", short: "Unit 5" },
      { code: "WPH16", name: "Practical Skills in Physics II", short: "Unit 6" },
    ],
  },
  {
    key: "chemistry",
    label: "Chemistry",
    units: [
      { code: "WCH11", name: "Structure, Bonding and Introduction to Organic Chemistry", short: "Unit 1" },
      { code: "WCH12", name: "Energetics, Group Chemistry, Halogenoalkanes and Alcohols", short: "Unit 2" },
      { code: "WCH13", name: "Practical Skills in Chemistry I", short: "Unit 3" },
      { code: "WCH14", name: "Rates, Equilibria and Further Organic Chemistry", short: "Unit 4" },
      { code: "WCH15", name: "Transition Metals and Organic Nitrogen Chemistry", short: "Unit 5" },
      { code: "WCH16", name: "Practical Skills in Chemistry II", short: "Unit 6" },
    ],
  },
  {
    key: "biology",
    label: "Biology",
    units: [
      { code: "WBI11", name: "Molecules, Diet, Transport and Health", short: "Unit 1" },
      { code: "WBI12", name: "Cells, Development, Biodiversity and Conservation", short: "Unit 2" },
      { code: "WBI13", name: "Practical Skills in Biology I", short: "Unit 3" },
      { code: "WBI14", name: "Energy, Exercise and Coordination", short: "Unit 4" },
      { code: "WBI15", name: "Genetics, Evolution and Biodiversity", short: "Unit 5" },
      { code: "WBI16", name: "Practical Skills in Biology II", short: "Unit 6" },
    ],
  },
];

const DOC_TYPES = new Set(["Question paper", "Mark scheme", "Examiner report"]);
const SESSION_MONTHS = { January: 1, June: 6, October: 10 };

async function searchCode(code) {
  const params = new URLSearchParams({
    query: code,
    hitsPerPage: "1000",
    attributesToRetrieve: JSON.stringify(["title", "id", "category", "gating", "extension"]),
  });
  const res = await fetch(`https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
    method: "POST",
    headers: {
      "x-algolia-application-id": APP_ID,
      "x-algolia-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ params: params.toString() }),
  });
  if (!res.ok) throw new Error(`${code}: Algolia HTTP ${res.status}`);
  const json = await res.json();
  return json.hits ?? [];
}

function facetOf(categories, prefix) {
  const hit = categories.find((c) => c.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function basename(url) {
  const last = url.split("/").pop() ?? "";
  return decodeURIComponent(last).toLowerCase();
}

/**
 * Strict identity check: the PDF filename must start with the exact unit code
 * ("wma11-01..." or "WMA11_01..."), because Algolia prefix/typo matching makes
 * a "wma11" query also return wma12, wma13, wge01, old-spec wbi05, etc.
 */
function matchesCode(url, code) {
  const base = basename(url);
  const c = code.toLowerCase();
  return base.startsWith(`${c}-`) || base.startsWith(`${c}_`);
}

/** Paper variant from filename: "wma11-01a-que-..." -> "A", "...-01b-" -> "B". */
function variantOf(url) {
  const m = basename(url).match(/-01([a-z])-/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Higher score = more canonical copy of the same document.
 * Pearson re-publishes papers as "*_UNUSED*" contingency files and early
 * "*_msc_*" mark schemes that are later superseded by revised "*_rms_*".
 */
function canonicalScore(url) {
  const base = basename(url);
  let s = 0;
  if (base.includes("unused")) s -= 5;
  if (/-msc-|_msc_/.test(base)) s -= 2; // early mark scheme, revised later
  if (/-que-|_que_|-rms-|_rms_|-pef-|_pef_/.test(base)) s += 2;
  return s;
}

function parseHit(hit, code) {
  const cat = Array.isArray(hit.category) ? hit.category : [];
  if (!cat.includes("Pearson-UK:Qualification-Family/International-Advanced-Level")) return null;
  const docTypeRaw = facetOf(cat, "Pearson-UK:Document-Type/");
  if (!docTypeRaw) return null;
  const docType = docTypeRaw.replace(/-/g, " "); // "Question-paper" -> "Question paper"
  if (!DOC_TYPES.has(docType)) return null;
  const series = facetOf(cat, "Pearson-UK:Exam-Series/"); // e.g. "October-2023"
  if (!series) return null;
  const m = series.match(/^(.*)-(\d{4})$/);
  if (!m) return null;
  const session = m[1];
  const year = Number(m[2]);
  if (year < YEAR_MIN || year > YEAR_MAX) return null;
  if (!(session in SESSION_MONTHS)) return null;
  const url = hit.id && hit.id.startsWith("/") ? BASE + hit.id : null;
  if (!url || !url.endsWith(".pdf")) return null;
  if (!matchesCode(url, code)) return null; // kill cross-contamination
  const gated = hit.gating === true || url.includes("/secure/");
  return {
    code,
    docType,
    session,
    year,
    variant: variantOf(url),
    url,
    gated,
  };
}

async function main() {
  const grouped = new Map(); // key -> paper skeleton
  let totalDocs = 0;

  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      process.stdout.write(`Fetching ${unit.code} ... `);
      const hits = await searchCode(unit.code);
      let kept = 0;
      for (const hit of hits) {
        const p = parseHit(hit, unit.code);
        if (!p) continue;
        kept++;
        totalDocs++;
        const key = `${p.code}|${p.session}|${p.year}|${p.variant ?? ""}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            code: p.code,
            session: p.session,
            year: p.year,
            variant: p.variant,
            qp: null,
            ms: null,
            er: null,
          });
        }
        const entry = grouped.get(key);
        const doc = { url: p.url, gated: p.gated };
        const slot = p.docType === "Question paper" ? "qp" : p.docType === "Mark scheme" ? "ms" : "er";
        const existing = entry[slot];
        if (!existing) {
          entry[slot] = doc;
        } else {
          const oldScore = canonicalScore(existing.url) - (existing.gated ? 10 : 0);
          const newScore = canonicalScore(doc.url) - (doc.gated ? 10 : 0);
          if (newScore > oldScore || (existing.gated && !doc.gated)) {
            entry[slot] = doc;
          } else if (existing.url !== doc.url) {
            console.warn(`  dup ${slot} ${key}: keep ${existing.url.split("/").pop()}`, `(saw also ${doc.url.split("/").pop()})`);
          }
        }
      }
      console.log(`${hits.length} hits, ${kept} kept`);
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // assemble subjects -> units -> papers
  const papersByCode = new Map();
  for (const entry of grouped.values()) papersByCode.set(entry.code, [...(papersByCode.get(entry.code) ?? []), entry]);

  const sessionRank = (s) => (s === "October" ? 3 : s === "June" ? 2 : 1);
  const outSubjects = SUBJECTS.map((subject) => ({
    key: subject.key,
    label: subject.label,
    units: subject.units.map((unit) => {
      const papers = (papersByCode.get(unit.code) ?? []).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const r = sessionRank(b.session) - sessionRank(a.session);
        if (r !== 0) return r;
        return (a.variant ?? "").localeCompare(b.variant ?? "");
      });
      return { code: unit.code, name: unit.name, short: unit.short, papers };
    }),
  }));

  const data = {
    generatedAt: new Date().toISOString(),
    yearMin: YEAR_MIN,
    yearMax: YEAR_MAX,
    subjects: outSubjects,
  };

  const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "papers.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");

  // summary
  let paperCount = 0;
  let docCount = 0;
  for (const s of outSubjects)
    for (const u of s.units) {
      paperCount += u.papers.length;
      for (const p of u.papers) docCount += [p.qp, p.ms, p.er].filter(Boolean).length;
    }
  console.log(`\nSaved ${outPath}`);
  console.log(`Units: ${outSubjects.reduce((n, s) => n + s.units.length, 0)}  Papers: ${paperCount}  Docs: ${docCount}  (raw docs seen: ${totalDocs})`);

  // quick sanity: verify a mixed sample (ungated + gated) of URLs
  const ungatedSample = [];
  const gatedSample = [];
  for (const s of outSubjects)
    for (const u of s.units)
      for (const p of u.papers)
        for (const d of [p.qp, p.ms, p.er]) {
          if (!d) continue;
          if (d.gated && gatedSample.length < 3) gatedSample.push(d.url);
          if (!d.gated && ungatedSample.length < 4) ungatedSample.push(d.url);
        }
  console.log("\nVerifying sample URLs:");
  for (const url of [...ungatedSample, ...gatedSample]) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      console.log(`  ${res.status}${res.status === 401 ? " (gated)" : ""} ${url.split("/").pop()}`);
    } catch (e) {
      console.log(`  ERR ${url}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
