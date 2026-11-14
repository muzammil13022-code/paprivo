/**
 * Fills the topic sections that shipped without a verified video.
 *
 * Picks were chosen by hand against the Pearson IAL specification order, then
 * every id is re-checked against YouTube's oEmbed endpoint here so a listed
 * video always exists. Titles and channels come from oEmbed, not from this file.
 *
 * Usage: node scripts/fill-video-gaps.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (compatible; Paprivo research)";
const VIDEOS = "src/data/videos.json";
const TOPICS = "src/data/topics.json";

/** unit -> section slug -> [video id, tags] */
const PICKS = {
  WCH12: {
    "chem-topic-8": [
      ["j8M1ihTdD1w", ["IAL", "Lesson"]],
    ],
  },
  WCH13: {
    "chem-practical-1": [
      ["BkVndJUnNkc", ["Exam technique"]],
      ["_owWiKzKdfI", ["Walkthrough"]],
    ],
  },
  WCH14: {
    "chem-topic-12": [
      ["ab478ih7Esw", ["Edexcel", "Lesson"]],
      ["eE8xvgUgTZw", ["Concept support"]],
    ],
    "chem-topic-13": [
      ["Gc0EwJTWmGc", ["IAL", "Lesson"]],
      ["J4WJCYpTYj8", ["Concept support"]],
    ],
  },
  WCH15: {
    "chem-topic-17": [
      ["bcrb_vl0dq0", ["Edexcel", "Revision"]],
      ["AArtRcpypnw", ["IAL", "Lesson"]],
    ],
    "chem-topic-20": [
      ["0Of7WwJJcmk", ["IAL", "Lesson"]],
      ["xf4BJ9gOahk", ["Revision"]],
    ],
  },
  WCH16: {
    "chem-practical-2": [
      ["GtCKZDE3n8U", ["Exam technique"]],
      ["tDVGjuPbXp4", ["Revision"]],
    ],
  },
  WPH13: {
    "physics-practical-1": [
      ["No_xQ0Ycw4s", ["Exam technique"]],
      ["o1ai6nymCNM", ["Revision"]],
    ],
  },
  WPH14: {
    "physics-topic-7": [
      ["xsVzk2B-CPo", ["Edexcel", "Revision"]],
      ["8dfBUxRzWxU", ["Concept support"]],
    ],
  },
  WPH15: {
    "physics-topic-11": [
      ["bCrClNWH_Y8", ["Edexcel", "Revision"]],
      ["4Ws2A6hsrI0", ["Concept support"]],
      ["Sqs-dWJB2CQ", ["Concept support"]],
    ],
  },
  WPH16: {
    "physics-practical-2": [
      ["eEZ8WEOMT-o", ["Revision"]],
      ["FQLiXawOOT4", ["Exam technique"]],
    ],
  },
  WBI13: {
    "bio-practical-1": [
      ["8RVK-vCKX-Q", ["Revision"]],
      ["dSQ5H1fL1Oo", ["Exam technique"]],
    ],
  },
  WBI14: {
    "bio-topic-5": [
      ["JDIZ9F7Rbw0", ["Edexcel", "Revision"]],
      ["KOpO87TLWUs", ["IAL", "Lesson"]],
    ],
  },
  WBI15: {
    "bio-topic-8": [
      ["L24NWY3Taas", ["Edexcel", "Lesson"]],
      ["jHx-01plgyY", ["Concept support"]],
    ],
  },
  WBI16: {
    "bio-practical-2": [
      ["83lS7oJ5WRU", ["Exam technique"]],
      ["FsRQtuTyWCQ", ["Revision"]],
    ],
  },
};

/** Units with no sections at all: build them from the specification topics. */
const NEW_UNITS = {
  WME03: [
    ["Variable acceleration", "m3-variable-acceleration", [["uB3aZRL48_4", ["IAL", "Lesson"]], ["VmFejlRepKM", ["Past paper"]]]],
    ["Elastic strings and springs", "m3-elastic-strings", [["iD8qDTDKd9k", ["Concept support"]], ["-N3Y6UU7V0E", ["IAL", "Lesson"]]]],
    ["Simple harmonic motion", "m3-shm", [["tL3EZIfHAIU", ["Concept support"]], ["az5L05GhAxM", ["Concept support"]]]],
    ["Centres of mass of solids", "m3-centres-of-mass", [["BKhIL7ltALw", ["Concept support"]], ["87EeSLHoA6c", ["Concept support"]]]],
  ],
  WST03: [
    ["Combinations of random variables", "s3-combinations", [["Eujxit90MOk", ["Concept support"]]]],
    ["Sampling distributions", "s3-sampling", [["RLnmwvF2N00", ["IAL", "Lesson"]], ["DKnw03lMxsw", ["IAL", "Lesson"]]]],
    ["Estimation and confidence", "s3-estimation", [["ENnlSlvQHO0", ["Concept support"]]]],
    ["Chi-squared tests", "s3-chi-squared", [["eK1DGTfppe8", ["Concept support"]], ["HKDqlYSLt68", ["Concept support"]]]],
    ["Hypothesis tests for means", "s3-hypothesis-means", [["9ENXa6c8WrM", ["Edexcel", "Lesson"]], ["6fXC4cYWIxw", ["Lesson"]]]],
  ],
};

async function oembed(id) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return { title: json.title, channel: json.author_name };
  } catch {
    return null;
  }
}

async function main() {
  const data = JSON.parse(await readFile(VIDEOS, "utf8"));
  const topics = JSON.parse(await readFile(TOPICS, "utf8"));
  const verified = new Map(); // id -> meta | null
  const failures = [];
  let added = 0;

  async function build(id, tags) {
    if (!verified.has(id)) verified.set(id, await oembed(id));
    const meta = verified.get(id);
    if (!meta) {
      failures.push(id);
      return null;
    }
    added += 1;
    return { i: id, t: meta.title, c: meta.channel, tags };
  }

  // 1. Fill sections that exist but have no videos.
  for (const [unit, bySlug] of Object.entries(PICKS)) {
    const sections = data.units[unit];
    if (!sections) {
      console.log(`! ${unit} missing from videos.json`);
      continue;
    }
    for (const [slug, picks] of Object.entries(bySlug)) {
      const section = sections.find((s) => s.slug === slug);
      if (!section) {
        console.log(`! ${unit}/${slug} section not found`);
        continue;
      }
      if (section.videos.length) continue;
      const videos = [];
      for (const [id, tags] of picks) {
        const v = await build(id, tags);
        if (v) videos.push(v);
      }
      section.videos = videos;
      console.log(`${unit}/${slug}: +${videos.length}`);
    }
  }

  // 2. Create the maths units that had no video sections at all.
  for (const [unit, sections] of Object.entries(NEW_UNITS)) {
    if (data.units[unit]) continue;
    const built = [];
    for (const [name, slug, picks] of sections) {
      const videos = [];
      for (const [id, tags] of picks) {
        const v = await build(id, tags);
        if (v) videos.push(v);
      }
      built.push({ name, summary: "", slug, videos });
      console.log(`${unit}/${slug}: +${videos.length}`);
    }
    data.units[unit] = built;
  }

  const sectionCount = Object.values(data.units).reduce((n, s) => n + s.length, 0);
  const videoCount = Object.values(data.units).reduce(
    (n, s) => n + s.reduce((m, x) => m + x.videos.length, 0),
    0,
  );
  const empty = Object.entries(data.units).flatMap(([code, secs]) =>
    secs.filter((s) => !s.videos.length).map((s) => `${code}/${s.slug}`),
  );

  if (!failures.length) {
    await writeFile(VIDEOS, JSON.stringify(data, null, 2) + "\n");
    console.log(`\nwrote ${VIDEOS}: +${added} videos, ${sectionCount} sections, ${videoCount} total`);
  } else {
    console.log(`\nnot written — unverified ids: ${failures.join(", ")}`);
    process.exit(1);
  }
  if (empty.length) console.log(`sections still empty: ${empty.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
