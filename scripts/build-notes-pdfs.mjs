/**
 * Builds src/data/notes-pdfs.json from StudyHub IAL's published revision notes.
 *
 * StudyHub serves each science unit at /subjects/<subject>/unit-<n>/ and links
 * its notes PDFs there; we deep-link those files (never re-host them), same
 * policy as the topical paper packs. Titles come from each PDF's own first
 * page, not from the file name. Mathematics has no per-unit pages there, so
 * its loose PDFs are mapped explicitly (scripts/notes-maths-map.mjs).
 *
 * Usage: node scripts/build-notes-pdfs.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { GUIDE_FILES, PREFIX_UNIT, UNIT_LABEL } from "./notes-maths-map.mjs";

const BASE = "https://studyhubIAL.replit.app";
const UA = "Mozilla/5.0 (compatible; Paprivo research)";
const SCIENCE_PREFIX = { chemistry: "WCH", physics: "WPH", biology: "WBI" };

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const strip = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** [url, label] pairs for every PDF anchor on a StudyHub page. */
function pdfAnchors(html) {
  const found = new Map();
  for (const m of html.matchAll(/<a[^>]*href="([^"]*\/pdfs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = decode(m[1]);
    const url = href.startsWith("http") ? href : new URL(href, BASE + "/").href;
    const label = strip(m[2]);
    const file = decodeURIComponent(url.split("/pdfs/")[1] ?? "");
    if (!file.toLowerCase().endsWith(".pdf")) continue;
    if (!found.has(url)) found.set(url, { label, file });
  }
  return [...found].map(([url, rest]) => ({ url, ...rest }));
}

/**
 * What a PDF says about itself: metadata title plus the first text page.
 * Used both to name the file and to spot files that belong to another subject
 * (StudyHub's chemistry pages do link a few Physics documents).
 */
async function inspectPdf(url, cache) {
  if (cache.has(url)) return cache.get(url);
  let out = { metaTitle: "", lines: [] };
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) {
      const doc = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
      const meta = await doc.getMetadata().catch(() => null);
      const { text } = await extractText(doc, { mergePages: false });
      out = {
        metaTitle: String(meta?.info?.Title ?? "").trim(),
        lines: (text[0] ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => !/^edexcel international/i.test(s))
          .filter((s) => !/^level \(ial\)/i.test(s))
          .filter((s) => !/^\(ial\)/i.test(s))
          .filter((s) => !/^contents$/i.test(s))
          .filter((s) => !/^edexcel$/i.test(s)),
      };
    }
  } catch {
    out = { metaTitle: "", lines: [] };
  }
  cache.set(url, out);
  return out;
}

const SUBJECT_WORDS = ["physics", "chemistry", "biology", "maths", "mathematics"];

/** Does this PDF announce a subject other than the unit it is filed under? */
function foreignSubject(info, subject) {
  const hay = `${info.metaTitle} ${info.lines.slice(0, 3).join(" ")}`.toLowerCase();
  const named = SUBJECT_WORDS.filter((w) => hay.includes(w));
  if (named.length === 0) return false;
  const own = subject === "mathematics" ? ["maths", "mathematics"] : [subject];
  return !named.some((w) => own.includes(w)) || named.some((w) => !own.includes(w));
}

/** Human title for a PDF, preferring its own metadata over its file name. */
function titleFrom(info, fallback) {
  const fromMeta = info.metaTitle.replace(/\s+/g, " ").trim();
  if (fromMeta.length >= 4 && !/\.pdf$/i.test(fromMeta)) return fromMeta.slice(0, 90);
  if (info.lines.length > 0) {
    const title = info.lines.slice(0, 2).join(" — ").replace(/\s+/g, " ").trim();
    if (title.length >= 4) return title.slice(0, 90);
  }
  return fallback;
}



async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        out[index] = await fn(items[index], index);
      }
    }),
  );
  return out;
}

async function buildSciences(unitNames) {
  const units = {};
  const cache = new Map();
  for (const [subject, prefix] of Object.entries(SCIENCE_PREFIX)) {
    for (let n = 1; n <= 6; n++) {
      const code = `${prefix}1${n}`;
      const html = await get(`${BASE}/subjects/${subject}/unit-${n}/`);
      // Question packs ("MaterialsQP3") are practice papers, not notes.
      const notes = pdfAnchors(html).filter((p) => !/qp\d*\.[a-z]+$/i.test(p.file) && !/^materialsqp/i.test(p.file));
      const inspected = await mapLimit(notes, 4, async (p) => ({ p, info: await inspectPdf(p.url, cache) }));
      const own = inspected.filter(({ info }) => !foreignSubject(info, subject));
      const dropped = inspected.length - own.length;
      const packs = own.map(({ p, info }, i) => ({
        title: titleFrom(info, `${unitNames.get(code) ?? code} — scanned notes${own.length > 1 ? ` ${i + 1}` : ""}`),
        url: p.url,
        source: "StudyHub IAL",
      }));
      units[code] = [...new Map(packs.map((p) => [p.url, p])).values()];
      console.log(`${code}: ${units[code].length} PDFs${dropped ? ` (${dropped} cross-subject files skipped)` : ""}`);
    }
  }
  return units;
}

/**
 * Mathematics: StudyHub has no per-unit pages, so its whole library is read
 * from the sitemap and topic packs are assigned by file prefix. Topic packs
 * carry a metadata title ending "… Revision Notes …"; question packs carry
 * none, which is exactly how they are excluded.
 */
async function buildMaths() {
  const cache = new Map();
  const sitemap = await get(`${BASE}/sitemap.xml`);
  const files = [
    ...new Set([...sitemap.matchAll(/\/pdfs\/([^<"']+\.pdf)/g)].map((m) => decodeURIComponent(m[1]))),
  ];

  const numbered = [];
  for (const file of files) {
    const m = file.toLowerCase().match(/^([pms][1-4])(\d+)\.pdf$/);
    const unit = m && PREFIX_UNIT[m[1]];
    if (!unit) continue;
    numbered.push({ file, unit, n: Number(m[2]) });
  }
  console.log(`maths: ${numbered.length} numbered topic files in sitemap`);

  const inspected = await mapLimit(numbered, 6, async (item) => ({
    item,
    info: await inspectPdf(`${BASE}/pdfs/${encodeURIComponent(item.file)}`, cache),
  }));

  const units = {};
  const add = (unit, pack) => (units[unit] ??= []).push(pack);

  for (const { item, info } of inspected) {
    if (!/revision notes/i.test(info.metaTitle)) continue;
    const topic = info.metaTitle.split("|")[0].trim();
    add(item.unit, {
      title: `${UNIT_LABEL[item.unit]} — ${topic}`,
      url: `${BASE}/pdfs/${encodeURIComponent(item.file)}`,
      source: "StudyHub IAL",
      n: item.n,
    });
  }
  for (const [file, entry] of Object.entries(GUIDE_FILES)) {
    const published = files.find((f) => f.toLowerCase() === file);
    if (!published) continue;
    add(entry.unit, {
      title: entry.title,
      url: `${BASE}/pdfs/${encodeURIComponent(published)}`,
      source: "StudyHub IAL",
      n: 0,
    });
  }
  for (const packs of Object.values(units)) packs.sort((a, b) => a.n - b.n);
  for (const packs of Object.values(units)) for (const p of packs) delete p.n;
  for (const [code, packs] of Object.entries(units)) console.log(`${code}: ${packs.length} PDFs`);
  return units;
}

async function verify(units) {
  const bad = [];
  for (const packs of Object.values(units)) {
    for (const p of packs) {
      const res = await fetch(p.url, { headers: { "user-agent": UA }, method: "HEAD" });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) bad.push(p.url);
    }
  }
  return bad;
}

async function main() {
  const topics = JSON.parse(await readFile("src/data/topics.json", "utf8"));
  const unitNames = new Map();
  for (const s of Object.values(topics.subjects)) for (const u of s.units) unitNames.set(u.code, u.name);

  const mathsOnly = process.argv.includes("--maths-only");
  let units;
  if (mathsOnly) {
    // Refresh only the maths units; leave the already-verified science packs alone.
    const existing = JSON.parse(await readFile("src/data/notes-pdfs.json", "utf8"));
    units = existing.units;
    for (const code of Object.keys(UNIT_LABEL)) delete units[code];
    Object.assign(units, await buildMaths());
  } else {
    units = { ...(await buildSciences(unitNames)), ...(await buildMaths()) };
  }
  const bad = await verify(units);
  if (bad.length) {
    console.error("not PDFs:\n" + bad.join("\n"));
    process.exit(1);
  }
  await writeFile(
    "src/data/notes-pdfs.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "StudyHub IAL (studyhubial.replit.app) revision notes, deep-linked",
        units,
      },
      null,
      2,
    ) + "\n",
  );
  const total = Object.values(units).reduce((n, p) => n + p.length, 0);
  console.log(`\nwrote src/data/notes-pdfs.json — ${Object.keys(units).length} units, ${total} PDFs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
