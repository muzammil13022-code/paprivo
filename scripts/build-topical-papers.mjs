/**
 * Builds src/data/topical-papers.json — per-topic question packs.
 *
 * Only real question material is included. Two sources:
 *
 *  StudyHub IAL publishes a few as
 *    m2-projectiles.pdf / m2-projectiles-ms.pdf   (unit topic + mark scheme)
 *    s2-poisson-distributions.pdf …
 *  plus scanned Physics packs (MaterialsQP1–6, motionQP1–6, waves1–4).
 *
 *  Physics & Maths Tutor publishes Edexcel IAL chemistry and biology topic
 *  questions on each unit page as "… QP.pdf" / "… MS.pdf" pairs (several
 *  question sets per unit). Those pages are read here; the PDFs are deep-linked.
 *
 *  Rocket Revise's topical packs arrive through src/data/rocket-packs.json,
 *  which build-rocket-packs.mjs writes from the collection's own link index
 *  (they are deep-linked to Google Drive, not hosted here).
 *
 * Revision notes are deliberately excluded — they live in notes-pdfs.json.
 *
 * Usage: node scripts/build-topical-papers.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://studyhubIAL.replit.app";
const UA = "Mozilla/5.0 (compatible; Paprivo research)";

const PMT_SITE = "https://www.physicsandmathstutor.com";
const PMT_PDF = "https://pmt.physicsandmathstutor.com";

/** unit prefix -> unit code, for "m2-topic" style packs. */
const UNIT_BY_PREFIX = { m2: "WME02", m3: "WME03", s2: "WST02" };

/** Scanned Physics packs: file prefix -> unit + topic. */
const SCANNED = {
  materialsqp: { unit: "WPH11", topic: "Materials" },
  motionqp: { unit: "WPH11", topic: "Motion and Kinematics" },
  waves: { unit: "WPH12", topic: "Waves" },
};

/** PMT unit pages to read: subject slug -> unit-code prefix. */
const PMT_SUBJECTS = { chemistry: "WCH", biology: "WBI" };

/** Rocket Revise packs, written by build-rocket-packs.mjs, merged in below. */
const LOCAL_MANIFEST = "src/data/rocket-packs.json";

/** Section order on the unit page. */
const SOURCE_RANK = { "Rocket Revise": 0, "StudyHub IAL": 1, "Physics & Maths Tutor": 2 };

/** Nicer topic wording where a straight title-case reads badly. */
const TOPIC_OVERRIDES = {
  "centre-of-mass-composite-body": "Centre of Mass of a Composite Body",
  "centres-of-mass": "Centres of Mass",
  "statics-of-rigid-bodies": "Statics of Rigid Bodies",
  "impulses-and-collisions": "Impulses and Collisions",
  "sampling-and-sampling-distributions": "Sampling and Sampling Distributions",
};

const SMALL_WORDS = new Set(["and", "of", "the", "in", "for", "to"]);

function titleCase(slug) {
  if (TOPIC_OVERRIDES[slug]) return TOPIC_OVERRIDES[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

const url = (file) => `${BASE}/pdfs/${encodeURIComponent(file)}`;

async function sitemapFiles() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  return [...new Set([...xml.matchAll(/\/pdfs\/([^<"']+\.pdf)/g)].map((m) => decodeURIComponent(m[1])))];
}

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

async function verify(entries) {
  const bad = [];
  await mapLimit(entries, 8, async (entry) => {
    const isDrive = entry.url.includes("drive.google.com");
    try {
      const res = await fetch(entry.url, {
        method: "HEAD",
        redirect: "manual", // Drive answers with a redirect; anything under 400 is reachable
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(12_000),
      });
      if (isDrive) {
        if (res.status >= 400) bad.push(`${entry.url} (HTTP ${res.status})`);
        return;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) bad.push(entry.url);
    } catch (err) {
      bad.push(`${entry.url} (${err.name})`);
    }
  });
  return bad;
}

const decodeEntities = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"');

/** "1.4 Energetics", "2.03-2.05 Shapes, …" -> "Energetics", "Shapes, …". */
const stripNumbering = (title) =>
  title.replace(/^\d[\d.]*(?:\s*[-–]\s*\d[\d.]*)?\s+/, "").trim();

/** "Energetics QP", "Energetics MS", "Waves QP 1" -> { base, kind }. */
function splitPmtFile(file) {
  const name = file.replace(/\.pdf$/i, "").trim();
  const m = name.match(/^(.*?)\s+(QP|MS)(?:\s+(\d+))?$/i);
  if (m) return { base: stripNumbering(m[1]), kind: m[2].toUpperCase() === "MS" ? "ms" : "qp", part: m[3] };
  return { base: stripNumbering(name), kind: "qp", part: undefined };
}

/** Pairs of topic questions + mark schemes from the IAL unit pages. */
async function pmtUnits() {
  const units = {};
  for (const [subject, prefix] of Object.entries(PMT_SUBJECTS)) {
    for (let n = 1; n <= 6; n++) {
      const unit = `${prefix}1${n}`;
      const page = `${PMT_SITE}/${subject}-revision/a-level-edexcel-ial/unit-${n}`;
      const res = await fetch(page, { headers: { "user-agent": UA } });
      if (!res.ok) {
        console.warn(`${unit}: unit page ${res.status}`);
        continue;
      }
      const html = await res.text();
      const links = [
        ...new Set(
          [...html.matchAll(/\/download\/[^"'<>\s]*Topic-Qs[^"'<>]*\.pdf/g)]
            .map((m) => decodeEntities(m[0]))
            .map((p) => (p.startsWith("http") ? p : PMT_PDF + encodeURI(p))),
        ),
      ];
      /** key -> { topic, set, files: { qp?: url[], ms?: url[] } } */
      const groups = new Map();
      links.forEach((link, index) => {
        const rel = link.split("Topic-Qs/")[1] ?? "";
        const parts = rel.split("/");
        const file = decodeURIComponent(parts[parts.length - 1] ?? "");
        const setDir = parts.length > 2 ? parts[parts.length - 2] : "";
        const set = setDir.replace(/^Set-/i, "") || "A";
        if (!file || !/\.pdf$/i.test(file)) return;
        const { base, kind } = splitPmtFile(file);
        if (!base) return;
        const key = base.toLowerCase();
        const group = groups.get(key) ?? { topic: base, set, order: index, files: { qp: [], ms: [] } };
        group.files[kind].push({ url: link, set });
        group.order = Math.min(group.order, index);
        groups.set(key, group);
      });

      const entries = [];
      for (const group of groups.values()) {
        const qps = group.files.qp;
        const mss = group.files.ms;
        if (qps.length === 0) continue; // mark scheme without questions is useless on its own
        const multiSet = new Set([...qps, ...mss].map((f) => f.set)).size > 1;
        const suffix = (f, i, total) => {
          if (total === 1 && !multiSet) return "";
          const tag = multiSet ? f.set : String(i + 1);
          return ` (${tag})`;
        };
        const qpFor = (i) => {
          if (!multiSet) return mss[0];
          return mss.find((m) => m.set === qps[i].set) ?? mss[0];
        };
        qps.forEach((f, i) => {
          const label = `Questions${suffix(f, i, qps.length)}`;
          entries.push({
            unit,
            topic: group.topic,
            label,
            kind: "qp",
            url: f.url,
            source: "Physics & Maths Tutor",
            seq: group.order + i / 100,
          });
          const ms = qpFor(i);
          if (ms) {
            entries.push({
              unit,
              topic: group.topic,
              label: `Mark scheme${suffix(f, i, qps.length)}`,
              kind: "ms",
              url: ms.url,
              source: "Physics & Maths Tutor",
              seq: group.order + i / 100 + 0.01,
            });
          }
        });
      }
      if (entries.length) units[unit] = entries;
      console.log(`${unit}: ${entries.filter((e) => e.kind === "qp").length} topic question papers`);
    }
  }
  return units;
}

async function main() {
  const files = await sitemapFiles();
  const studyhub = [];
  const studyhubUnits = {};

  // Topic packs: "<prefix>-<topic>.pdf" plus optional "-ms".
  for (const file of files) {
    const m = file.toLowerCase().match(/^([a-z]\d)-([a-z0-9-]+?)(-ms)?\.pdf$/);
    if (!m) continue;
    const unit = UNIT_BY_PREFIX[m[1]];
    if (!unit) continue;
    const [, , slug, ms] = m;
    studyhub.push({
      unit,
      topic: titleCase(slug),
      label: ms ? "Mark scheme" : "Questions",
      kind: ms ? "ms" : "qp",
      url: url(file),
      source: "StudyHub IAL",
      n: 0,
    });
  }

  // Scanned packs: MaterialsQP1…6, motionQP1…6, waves1…4.
  for (const file of files) {
    const m = file.toLowerCase().match(/^(materialsqp|motionqp|waves)(\d+)\.pdf$/);
    if (!m) continue;
    const conf = SCANNED[m[1]];
    studyhub.push({
      unit: conf.unit,
      topic: conf.topic,
      label: `Pack ${m[2]}`,
      kind: "scanned",
      url: url(file),
      source: "StudyHub IAL",
      n: Number(m[2]),
    });
  }

  for (const e of studyhub) (studyhubUnits[e.unit] ??= []).push(e);

  const pmt = await pmtUnits();

  let local = {};
  try {
    local = JSON.parse(await readFile(LOCAL_MANIFEST, "utf8")).units ?? {};
  } catch {
    console.log(`no ${LOCAL_MANIFEST} — skipping locally imported packs`);
  }

  const units = {};
  for (const group of [local, studyhubUnits, pmt]) {
    for (const [unit, list] of Object.entries(group)) (units[unit] ??= []).push(...list);
  }

  const all = Object.values(units).flat();
  if (all.length === 0) throw new Error("no topical packs found — refusing to write");
  const bad = await verify(all);
  if (bad.length) {
    console.error("not PDFs:\n" + bad.join("\n"));
    process.exit(1);
  }

  // PMT keeps the unit page's (specification) order; StudyHub sorts by topic,
  // questions before mark schemes.
  const KIND_ORDER = { qp: 0, ms: 1, scanned: 2 };
  const rank = (e) => SOURCE_RANK[e.source] ?? 9;
  for (const list of Object.values(units)) {
    list.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.seq ?? Number.POSITIVE_INFINITY) - (b.seq ?? Number.POSITIVE_INFINITY) ||
        a.topic.localeCompare(b.topic) ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        (a.n ?? 0) - (b.n ?? 0),
    );
    for (const e of list) {
      delete e.n;
      delete e.seq;
    }
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source:
      "Rocket Revise, StudyHub IAL and Physics & Maths Tutor topical question packs. Rocket Revise PDFs are hosted by Paprivo; the others are deep-linked.",
    units,
  };
  await writeFile("src/data/topical-papers.json", JSON.stringify(data, null, 2) + "\n");
  const total = Object.values(units).reduce((n, l) => n + l.length, 0);
  console.log(`wrote src/data/topical-papers.json — ${Object.keys(units).length} units, ${total} files`);
  for (const [code, list] of Object.entries(units)) {
    const topics = [...new Set(list.map((e) => e.topic))];
    console.log(`  ${code}: ${topics.length} topics, ${list.length} files`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
