/**
 * Builds src/data/rocket-packs.json from the Rocket Revise Edexcel IAL AS
 * topical collection.
 *
 * The PDFs stay on Rocket Revise's Google Drive: Vercel's Hobby plan caps
 * static uploads at 100 MB and the collection is ~186 MB, so bundling it in
 * public/ blocks deployment. Question papers were downloadable, so they are
 * linked with Drive's direct-download URL; the mark schemes the owner has
 * restricted to viewing are linked to the Drive viewer so they stay reachable.
 *
 * Source of truth for the links is the collection itself: "Download index.csv"
 * for question papers, README.md for the view-only mark schemes.
 *
 * Usage: node scripts/build-rocket-packs.mjs [<collection folder>]
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_SRC =
  "C:/Users/Muzam/OneDrive/Desktop/Rocket revise/Rocket-Revise-Edexcel-International-AS-Topical-PDFs/Rocket Revise - Edexcel International AS Topical PDFs";
/** Exported for upload-rocket-pdfs.mjs, which stores each PDF under the same path. */
/** Override with ROCKET_SRC when the collection lives somewhere else. */
export const SOURCE_DIR = process.env.ROCKET_SRC ?? DEFAULT_SRC;
export const SKIP_FILES = new Set([
  "Physics/Core Practical 3 - Young Modulus of Material - QP.pdf", // byte-identical to 3A Basic Waves
  "Chemistry/3A Ionic Bonding - QP - Copy.pdf", // duplicate of 3A Ionic Bonding
]);

const SRC = SOURCE_DIR;
const MANIFEST = "src/data/rocket-packs.json";
/** Written by upload-rocket-pdfs.mjs once the PDFs are hosted, e.g. on Blob. */
const HOSTING = "src/data/rocket-hosting.json";
const UA = "Mozilla/5.0 (compatible; Paprivo research)";

/**
 * Which unit each numbered topic belongs to. IAL AS units:
 *   Chemistry WCH11 = topics 1–6, WCH12 = topics 7–10
 *   Biology   WBI11 = topics 1–2, WBI12 = topics 3–4
 *   Physics   WPH11 = topics 1–2 (mechanics, materials), WPH12 = topics 3–4 (waves, electricity)
 */
const UNIT_BY_SUBJECT_DIGIT = {
  Chemistry: { 1: "WCH11", 2: "WCH11", 3: "WCH11", 4: "WCH11", 5: "WCH11", 6: "WCH11", 7: "WCH12", 8: "WCH12", 9: "WCH12", 10: "WCH12" },
  Biology: { 1: "WBI11", 2: "WBI11", 3: "WBI12", 4: "WBI12" },
  Physics: { 1: "WPH11", 2: "WPH11", 3: "WPH12", 4: "WPH12" },
};

const MATHS_UNITS = { P1: "WMA11", P2: "WMA12", M1: "WME01", S1: "WST01" };

/** Physics core practicals are Unit 1 practical work; CP3 is a broken link. */
const PHYSICS_PRACTICALS = {
  "Core Practical 1 - objects": { unit: "WPH11", topic: "Core Practical 1 (Free Fall)" },
  "Core Practical 2 - Viscocity of Liquids": { unit: "WPH11", topic: "Core Practical 2 (Viscosity)" },
};
const SKIP = SKIP_FILES;

/** README bullet subject -> unit, for the view-only mark schemes. */
const MS_UNIT_BY_KEY = {
  "Maths P1": "WMA11",
  "Maths P2": "WMA12",
  "Maths M1": "WME01",
  "Maths S1": "WST01",
  Chemistry: "WCH11", // Topic 5 Alkenes
};

const SMALL_WORDS = new Set(["and", "of", "the", "in", "for", "to", "a", "on"]);

/** "2B DENSITY- FLUIDS & UPTHRUST" -> "2B Density, Fluids & Upthrust". */
function niceTopic(raw) {
  const name = raw
    .replace(/\s*-\s*(QP|MS)$/i, "")
    .replace(/\s*-\s*Copy$/i, "")
    .replace(/(\w)-s\b/g, "$1's") // Newton-s -> Newton's
    .replace(/-\s*/g, ", ") // "Work- Power- Energy" -> "Work, Power, Energy"
    .replace(/\s+/g, " ")
    .trim();

  const capFirst = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);
  const titled = name
    .split(" ")
    .map((token, i) => {
      const m = token.match(/^([A-Za-z0-9'&]+)(,?)$/);
      if (!m) return token;
      const [, word, comma] = m;
      if (/^[A-Z0-9&']+$/.test(word) && word.length > 1) {
        const lower = word.toLowerCase();
        return (i > 0 && SMALL_WORDS.has(lower) ? lower : capFirst(lower)) + comma;
      }
      // Capitalise a stray lowercase word ("organic Chemistry" -> "Organic"), but
      // leave short formula fragments such as "ma" alone.
      if (i > 0 && /^[a-z]{3,}$/.test(word) && !SMALL_WORDS.has(word)) return capFirst(word) + comma;
      return token;
    })
    .join(" ");

  return capFirst(titled)
    .replace(/\b(\d+)([a-z]+)\b/g, (_, n, letters) => `${n}${letters.toUpperCase()}`) // 1a -> 1A, 4c -> 4C
    .replace(/\bDna\b/g, "DNA")
    .replace(/\bSuvat\b/g, "SUVAT")
    .replace(/\bF,? ma\b/g, "F = ma")
    .replace(/\bBehavior\b/g, "Behaviour")
    .replace(/\bStokes Law\b/g, "Stokes' Law");
}

/** First number in a topic name, so 2B sorts before 10AB. */
const numericKey = (s) => {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 999;
};

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** URL-safe file stem for the hosted copy: "3A Ionic Bonding" -> "3a-ionic-bonding". */
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Question papers use Drive's direct-download form while the owner allows it. */
const downloadUrl = (id) => `https://drive.google.com/uc?export=download&id=${id}`;
/** The file page always opens, even when downloading is blocked. */
const viewUrl = (id) => `https://drive.google.com/file/d/${id}/view`;

/** Run `fn` over `items` with a bounded number of requests in flight. */
async function mapLimit(items, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        await fn(items[index], index);
      }
    }),
  );
}

/**
 * Does the direct-download link still hand back a PDF? When the owner has
 * blocked downloads Drive answers with its "Can't download file" HTML page,
 * so anything that is not a PDF means the viewer is the only way in.
 */
async function downloadsDirectly(id) {
  try {
    const res = await fetch(downloadUrl(id), {
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    const type = res.headers.get("content-type") ?? "";
    await res.body?.cancel();
    return /application\/pdf|application\/octet-stream/i.test(type);
  } catch {
    return false;
  }
}

/**
 * "Download index.csv" rows look like
 *   Chemistry,4B Alkanes,QP,downloaded,Chemistry/4B Alkanes - QP.pdf,1704825,<page>,<drive url>,
 * The topic column is not quoted, so read the file path and URL by pattern.
 */
function parseIndex(csv) {
  const byFile = new Map();
  for (const line of csv.split(/\r?\n/)) {
    const file = (line.match(/([^,]+\.pdf)/) ?? [])[1];
    const id = (line.match(/https:\/\/drive\.google\.com\/(?:file\/d|uc\?(?:export=download&)?id=)\/([^/&,]+)/) ?? [])[1];
    if (file && id) byFile.set(file.trim(), id);
  }
  return byFile;
}

/** README lists the blocked mark schemes with their Drive viewer links. */
function parseMarkSchemes(readme) {
  const out = new Map();
  for (const m of readme.matchAll(/^- \*\*(.+?)\*\*: \[View mark scheme\]\((https:\/\/drive\.google\.com\/[^)]+)\)/gm)) {
    const [subjectKey, ...rest] = m[1].split(",");
    const unit = MS_UNIT_BY_KEY[subjectKey.trim()];
    const id = (m[2].match(/\/d\/([^/]+)/) ?? [])[1];
    if (!unit || !id) continue;
    out.set(`${unit}|${normalize(rest.join(","))}`, viewUrl(id));
  }
  return out;
}

/**
 * Unit, topic and hosted pathname for a file in the collection. Exported so
 * upload-rocket-pdfs.mjs stores each PDF under exactly the URL built here.
 */
export function resolveFile(rel) {
  const parts = rel.split("/");
  const folder = parts[0];
  const file = parts[parts.length - 1];
  if (!/\.pdf$/i.test(file)) return null;
  const base = file.replace(/\.pdf$/i, "").replace(/\s*-\s*(QP|MS)$/i, "");

  let unit;
  let topic;
  if (folder === "Maths") {
    unit = MATHS_UNITS[parts[1]];
    if (!unit) return null;
    topic = niceTopic(base);
  } else if (PHYSICS_PRACTICALS[base]) {
    ({ unit, topic } = PHYSICS_PRACTICALS[base]);
  } else {
    const map = UNIT_BY_SUBJECT_DIGIT[folder];
    if (!map) return null;
    // "4B Alkanes" and "Topic 5 Alkenes" both carry their topic number.
    unit = map[Number((base.match(/(\d+)/) ?? [])[1])];
    if (!unit) return null;
    topic = niceTopic(base);
  }

  const isMs = /\s-\s*MS\.pdf$/i.test(file);
  return {
    unit,
    topic,
    isMs,
    base,
    pathname: `${unit.toLowerCase()}/${slug(base)}${isMs ? "-ms" : ""}.pdf`,
  };
}

/** Base URL of the hosted copies, if they have been uploaded. */
async function hostingBase() {
  if (process.env.ROCKET_BLOB_BASE) return process.env.ROCKET_BLOB_BASE.replace(/\/$/, "");
  try {
    return String(JSON.parse(await readFile(HOSTING, "utf8")).base ?? "").replace(/\/$/, "") || null;
  } catch {
    return null;
  }
}

async function walk(dir) {
  const { readdir } = await import("node:fs/promises");
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.pdf$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`collection not found: ${SRC}`);
  const files = await walk(SRC);
  const index = parseIndex(await readFile(path.join(SRC, "Download index.csv"), "utf8"));
  const markSchemes = parseMarkSchemes(await readFile(path.join(SRC, "README.md"), "utf8"));

  const units = {};
  const missing = [];
  const pending = [];

  for (const full of files.sort()) {
    const rel = path.relative(SRC, full).split(path.sep).join("/");
    if (SKIP.has(rel)) continue;
    const fileId = index.get(rel);
    if (!fileId) {
      missing.push(rel);
      continue;
    }

    const resolved = resolveFile(rel);
    if (!resolved) continue;
    const { unit, topic, isMs, base, pathname } = resolved;
    pending.push({
      unit,
      topic,
      label: isMs ? "Mark scheme" : "Questions",
      kind: isMs ? "ms" : "qp",
      id: fileId,
      pathname,
      n: numericKey(base),
    });
  }

  // Hosted copies win. Otherwise question papers link straight to the PDF and
  // fall back to the Drive viewer if the owner has blocked downloading.
  const base = await hostingBase();
  const fallbacks = [];
  await mapLimit(pending, 6, async (item) => {
    let url;
    if (base) {
      url = `${base}/${item.pathname}`;
    } else if (item.kind === "qp") {
      url = downloadUrl(item.id);
      if (!(await downloadsDirectly(item.id))) {
        url = viewUrl(item.id);
        fallbacks.push(`${item.unit} :: ${item.topic}`);
      }
    } else {
      url = viewUrl(item.id);
    }
    (units[item.unit] ??= []).push({
      topic: item.topic,
      label: item.label,
      kind: item.kind,
      url,
      source: "Rocket Revise",
      n: item.n,
    });
  });

  // Attach the view-only mark schemes to the topic they belong to.
  let msAdded = 0;
  const unmatchedMs = [];
  for (const [key, url] of markSchemes) {
    const [unit, topicKey] = key.split("|");
    const list = units[unit] ?? [];
    const entry = list.find((e) => normalize(e.topic) === topicKey && e.kind === "qp");
    if (!entry) {
      unmatchedMs.push(`${unit} :: ${topicKey}`);
      continue;
    }
    list.push({
      topic: entry.topic,
      label: "Mark scheme",
      kind: "ms",
      url,
      source: "Rocket Revise",
      n: entry.n,
    });
    msAdded += 1;
  }

  for (const list of Object.values(units)) {
    list.sort((a, b) => a.n - b.n || a.topic.localeCompare(b.topic) || (a.kind === "ms" ? 1 : 0) - (b.kind === "ms" ? 1 : 0));
    list.forEach((e, i) => {
      e.seq = i; // keep specification order through the merge in build-topical-papers.mjs
      delete e.n;
    });
  }

  await writeFile(
    MANIFEST,
    JSON.stringify(
      {
        source: "Rocket Revise (rocketrevise.com) Edexcel IAL AS topical packs, deep-linked to Google Drive",
        units,
      },
      null,
      2,
    ) + "\n",
  );

  const total = Object.values(units).reduce((n, l) => n + l.length, 0);
  console.log(`linked ${total} files (${msAdded} view-only mark schemes) across ${Object.keys(units).length} units`);
  if (missing.length) console.log(`no Drive link found for:\n  ${missing.join("\n  ")}`);
  if (fallbacks.length)
    console.log(`download blocked — linked to the Drive viewer instead:\n  ${fallbacks.join("\n  ")}`);
  if (unmatchedMs.length) console.log(`mark schemes without a matching topic:\n  ${unmatchedMs.join("\n  ")}`);
  for (const [code, list] of Object.entries(units)) {
    console.log(`  ${code}: ${[...new Set(list.map((e) => e.topic))].length} topics, ${list.length} files`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
