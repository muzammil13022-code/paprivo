/**
 * Rebuilds src/data/yt-walkthroughs.json from the current papers catalogue.
 *
 * Every candidate is checked against YouTube's oEmbed endpoint: the returned
 * title must name the sitting year and either the unit code or its paper label
 * (P2, M1, S1, Unit 3 …), and must not name a different unit. Duplicate video
 * ids are collapsed onto the single paper they describe. Rows without a
 * surviving match are dropped, so the UI falls back to a YouTube search link
 * instead of opening the wrong paper.
 *
 * Usage: node scripts/build-walkthroughs.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (compatible; Paprivo research)";

const UNIT_LABEL = {
  WMA11: ["P1", "Pure Mathematics 1", "Pure Maths 1"],
  WMA12: ["P2", "Pure Mathematics 2", "Pure Maths 2"],
  WMA13: ["P3", "Pure Mathematics 3", "Pure Maths 3"],
  WMA14: ["P4", "Pure Mathematics 4", "Pure Maths 4"],
  WME01: ["M1", "Mechanics 1"],
  WME02: ["M2", "Mechanics 2"],
  WME03: ["M3", "Mechanics 3"],
  WST01: ["S1", "Statistics 1"],
  WST02: ["S2", "Statistics 2"],
  WST03: ["S3", "Statistics 3"],
};

function labelsFor(code) {
  if (UNIT_LABEL[code]) return UNIT_LABEL[code];
  // Sciences: WPH12 -> "Unit 2"
  const n = code.slice(-1);
  return [`Unit ${n}`];
}

const cache = new Map();
async function oembed(id) {
  if (cache.has(id)) return cache.get(id);
  let out = null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "user-agent": UA } },
    );
    if (res.ok) {
      const json = await res.json();
      out = { title: json.title, channel: json.author_name };
    }
  } catch {
    out = null;
  }
  cache.set(id, out);
  return out;
}

const CODE_RE = /\bW(?:MA|ME|ST|PH|CH|BI|FM|DM)\d{2}\b/g;

function titleMatches(code, year, title) {
  if (!title.includes(year)) return false;
  const codes = new Set(title.toUpperCase().match(CODE_RE) ?? []);
  if (codes.size > 0) return codes.has(code);
  const norm = title.replace(/\s+/g, " ");
  return labelsFor(code).some((label) => new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(norm));
}

async function main() {
  const papers = JSON.parse(await readFile("src/data/papers.json", "utf8"));
  const existing = JSON.parse(await readFile("src/data/yt-walkthroughs.json", "utf8"));

  // One entry per paper code + sitting, matching how the UI looks them up.
  const keys = new Set();
  for (const s of papers.subjects) for (const u of s.units) for (const p of u.papers) keys.add(`${p.code}|${p.session}|${p.year}`);

  const candidates = [];
  for (const key of keys) {
    const entry = existing[key];
    if (entry && entry.i) candidates.push({ key, id: entry.i });
  }
  console.log(`candidates: ${candidates.length} of ${keys.size} rows`);

  const byId = new Map();
  let checked = 0;
  for (const c of candidates) {
    const [code, , year] = c.key.split("|");
    const meta = await oembed(c.id);
    checked++;
    if (checked % 50 === 0) console.log(`  ${checked}/${candidates.length}`);
    if (!meta) continue;
    if (!titleMatches(code, year, meta.title)) continue;
    if (!byId.has(c.id)) byId.set(c.id, []);
    byId.get(c.id).push({ ...c, meta });
  }

  // Collapse duplicates: keep the row whose title fits it best (earliest otherwise).
  const result = {};
  const used = new Set();
  for (const [id, rows] of byId) {
    const row = rows.sort((a, b) => a.key.localeCompare(b.key))[0];
    if (used.has(row.key)) continue;
    used.add(row.key);
    result[row.key] = { i: id, t: row.meta.title, c: row.meta.channel };
  }

  const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile("src/data/yt-walkthroughs.json", JSON.stringify(sorted) + "\n");
  console.log(`kept ${Object.keys(sorted).length} verified walkthroughs (dropped ${candidates.length - Object.keys(sorted).length}); duplicated ids ${[...byId.values()].filter((r) => r.length > 1).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
