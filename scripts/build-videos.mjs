/**
 * Builds src/data/videos.json — the topic video library.
 *
 * Structure and pick list follow the open Syllabus library
 * (edexcel-library.vercel.app), which groups videos by Pearson spec topic.
 * Sections that library leaves empty are filled from the hand-picked list in
 * scripts/curated-videos.mjs (which also supplies units the library has no
 * page for, e.g. WME03 and WST03), so a rebuild never drops those picks.
 * Every id is re-checked against YouTube's oEmbed endpoint before it ships,
 * and any topic without a verified pick is simply left without videos.
 *
 * Usage: node scripts/build-videos.mjs
 */
import { writeFile, readFile } from "node:fs/promises";
import { CURATED_OVERRIDES, CURATED_PICKS, CURATED_UNITS } from "./curated-videos.mjs";

const LIB = "https://edexcel-library.vercel.app";
const UA = "Mozilla/5.0 (compatible; Paprivo research)";

const SUBJECTS = [
  { key: "chemistry", slug: "chemistry" },
  { key: "physics", slug: "physics" },
  { key: "biology", slug: "biology" },
  { key: "mathematics", slug: "mathematics" },
];

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&ndash;/g, "–");

const strip = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** Topic slugs linked from a unit page, in page order. */
async function unitTopics(slug) {
  const html = await get(`${LIB}/unit/${slug}/`);
  return [...html.matchAll(/href="\/topic\/([^"/]+)\/"/g)].map((m) => m[1]);
}

/** Parse a topic page into { name, videos[] }. */
function parseTopic(html) {
  // The heading's trailing wordmark period is markup, not part of the name.
  const name = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [, ""])[1]).replace(/\s*\.$/, "");
  const summary = strip((html.match(/<div class="topic-title">[\s\S]*?<p>([\s\S]*?)<\/p>/) ?? [, ""])[1]);
  const videos = [];
  for (const m of html.matchAll(/<article class="video-card">([\s\S]*?)<\/article>/g)) {
    const card = m[1];
    const id = (card.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/) ?? [, ""])[1];
    const title = strip((card.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) ?? [, ""])[1]);
    const channel = strip((card.match(/<p class="channel">([\s\S]*?)<\/p>/) ?? [, ""])[1]);
    const note = strip((card.match(/<p class="editor-note">([\s\S]*?)<\/p>/) ?? [, ""])[1]);
    const tags = [...card.matchAll(/<div class="video-tags">[\s\S]*?<\/div>/g)]
      .flatMap((t) => [...t[0].matchAll(/<span>([^<]+)<\/span>/g)].map((x) => strip(x[1])));
    if (!id) continue;
    videos.push({ i: id, t: title, c: channel, tags, note });
  }
  return { name, summary, videos };
}

const oembedCache = new Map();
async function oembed(id) {
  if (oembedCache.has(id)) return oembedCache.get(id);
  let value = null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "user-agent": UA } },
    );
    if (res.ok) {
      const json = await res.json();
      value = { title: json.title, channel: json.author_name };
    }
  } catch {
    value = null;
  }
  oembedCache.set(id, value);
  return value;
}

async function main() {
  const papers = JSON.parse(await readFile("src/data/papers.json", "utf8"));
  const topics = JSON.parse(await readFile("src/data/topics.json", "utf8"));
  const unitCodes = new Map(); // slug -> unit code ("WCH11")
  for (const s of papers.subjects) for (const u of s.units) unitCodes.set(u.code.toLowerCase(), u.code);

  const units = {};
  let kept = 0;
  let dropped = 0;

  /** Verify a curated pick list and turn it into video entries. */
  async function verifyPicks(picks) {
    const out = [];
    for (const [id, tags] of picks) {
      const meta = await oembed(id);
      if (!meta) {
        dropped++;
        console.log(`  drop ${id} (not on YouTube)`);
        continue;
      }
      out.push({ i: id, t: meta.title, c: meta.channel, tags });
      kept++;
    }
    return out;
  }

  for (const subject of SUBJECTS) {
    const slugs = await get(`${LIB}/subject/${subject.slug}/`);
    const unitSlugs = [...new Set([...slugs.matchAll(/href="\/unit\/([^"/]+)\/"/g)].map((m) => m[1]))];
    for (const slug of unitSlugs) {
      const code = unitCodes.get(slug);
      if (!code) {
        console.log(`skip unit ${slug} (not on Paprivo)`);
        continue;
      }
      const topicSlugs = await unitTopics(slug);
      const sections = [];
      for (const topicSlug of topicSlugs) {
        const parsed = parseTopic(await get(`${LIB}/topic/${topicSlug}/`));
        const verified = [];
        for (const v of parsed.videos) {
          const meta = await oembed(v.i);
          if (!meta) {
            dropped++;
            continue;
          }
          verified.push({
            i: v.i,
            t: meta.title,
            c: meta.channel,
            tags: v.tags.length ? v.tags : ["Lesson"],
          });
          kept++;
        }
        sections.push({
          name: parsed.name,
          summary: parsed.summary,
          slug: topicSlug,
          videos: verified,
        });
      }
      units[code] = sections;
      console.log(`${code}: ${sections.length} topics, ${sections.reduce((n, s) => n + s.videos.length, 0)} videos`);
    }
  }

  // Fill sections the library left empty, then add units it has no page for.
  let curated = 0;
  for (const [code, bySlug] of Object.entries(CURATED_PICKS)) {
    const sections = units[code];
    if (!sections) {
      console.log(`curated: ${code} not in library yet, skipped`);
      continue;
    }
    for (const [slug, picks] of Object.entries(bySlug)) {
      const section = sections.find((s) => s.slug === slug);
      if (!section) {
        console.log(`curated: ${code}/${slug} section missing, skipped`);
        continue;
      }
      if (section.videos.length) continue;
      section.videos = await verifyPicks(picks);
      curated += section.videos.length;
      console.log(`curated ${code}/${slug}: ${section.videos.length} videos`);
    }
  }

  for (const [code, sections] of Object.entries(CURATED_UNITS)) {
    if (units[code]) continue;
    const built = [];
    for (const [name, slug, picks] of sections) {
      const videos = await verifyPicks(picks);
      built.push({ name, summary: "", slug, videos });
      curated += videos.length;
      console.log(`curated ${code}/${slug}: ${videos.length} videos`);
    }
    units[code] = built;
  }

  // Units whose topic layout is replaced by hand (pure maths: Mr Hassaan).
  for (const [code, sections] of Object.entries(CURATED_OVERRIDES)) {
    const built = [];
    for (const [name, slug, picks] of sections) {
      const videos = await verifyPicks(picks);
      built.push({ name, summary: "", slug, videos });
      curated += videos.length;
      console.log(`override ${code}/${slug}: ${videos.length} videos`);
    }
    units[code] = built;
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source: "Syllabus (edexcel-library.vercel.app) video picks, verified via YouTube oEmbed",
    note: "Picks follow the Pearson IAL specification order. Videos tagged “Concept support” may use broader A-level coverage; check the specification for exact IAL scope.",
    units,
  };
  await writeFile("src/data/videos.json", JSON.stringify(data, null, 2) + "\n");
  const totalVideos = Object.values(units).reduce((n, s) => n + s.reduce((m, x) => m + x.videos.length, 0), 0);
  console.log(`\nwrote src/data/videos.json — ${Object.keys(units).length} units, ${totalVideos} videos (kept ${kept}, dropped ${dropped}, ${curated} curated)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
