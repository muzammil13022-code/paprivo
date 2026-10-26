/**
 * Finds the top YouTube walkthrough video for every unique paper
 * (subject | code | session | year) and writes src/data/yt-walkthroughs.json.
 *
 * Strategy per paper:
 * - Mathematics: search "mr hassan maths <code> <session> <year> walkthrough"
 *   and take the first result from a channel matching /hassan/i; if none,
 *   fall back to the top result of "<code> <session> <year> walkthrough".
 * - Physics / Chemistry / Biology: top result of
 *   "<code> <session> <year> walkthrough"; falls back to
 *   "<code> <session> <year> solutions" when nothing is found.
 *
 * Resumable: papers already present in the output file are skipped.
 *
 *   node scripts/fetch-yt-walkthroughs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve("src/data/yt-walkthroughs.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function videoRenderers(data) {
  const vids = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) {
      o.forEach(walk);
      return;
    }
    if (o.videoRenderer && o.videoRenderer.videoId) vids.push(o.videoRenderer);
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(data);
  return vids;
}

async function searchVideos(query) {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`,
    {
      headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = /var ytInitialData = (\{.*?\});<\/script>/.exec(html);
  if (!m) throw new Error("no ytInitialData");
  const data = JSON.parse(m[1]);
  return videoRenderers(data).map((v) => ({
    id: v.videoId,
    title: v.title?.runs?.[0]?.text ?? "",
    channel: v.ownerText?.runs?.[0]?.text ?? "",
  }));
}

function buildTasks(codeFilter = null) {
  const papers = JSON.parse(readFileSync(path.resolve("src/data/papers.json"), "utf8"));
  const seen = new Map();
  for (const subject of papers.subjects) {
    for (const unit of subject.units) {
      for (const paper of unit.papers) {
        const key = `${paper.code}|${paper.session}|${paper.year}`;
        if (!seen.has(key)) {
          seen.set(key, {
            key,
            subject: subject.key,
            code: paper.code,
            session: paper.session,
            year: paper.year,
          });
        }
      }
    }
  }
  const all = [...seen.values()];
  return codeFilter ? all.filter((t) => codeFilter.includes(t.code)) : all;
}
// Quotes errors from individual queries so the retry loop can distinguish
// failures from legitimately empty result pages.
const fx = async (q) => {
  try {
    return await searchVideos(q);
  } catch (e) {
    throw new Error(`${q} -> ${e.message}`);
  }
};

/**
 * Pick the top result for a paper given a pool of candidate videos, in order:
 *  1. Hassan-channel videos that also mention the paper code (maths priority)
 *  2. Videos whose title mentions the paper code
 *  3. Any Hassan-channel video
 *  4. Videos mentioning IAL / Edexcel / International
 *  5. The plain top result
 */
function pick(task, candidates) {
  const rl = new RegExp(task.code, "i");
  const yr = new RegExp(String(task.year));
  const ed = /(^|\W)(IAL|Edexcel|International)(\W|$)/i;
  const hassan = (v) => /hass/i.test(v.channel);
  // Session on YouTube titles is often shortened ("May" instead of "June",
  // "Oct"/"Nov" instead of "October"), so match loosely on the year only.
  const groups = [
    candidates.filter((v) => hassan(v) && rl.test(v.title) && yr.test(`${v.title} ${v.channel}`)),
    candidates.filter((v) => rl.test(v.title) && yr.test(`${v.title} ${v.channel}`)),
    candidates.filter((v) => hassan(v) && rl.test(v.title)),
    candidates.filter((v) => rl.test(v.title)),
    candidates.filter((v) => hassan(v)),
    candidates.filter((v) => ed.test(`${v.title} ${v.channel}`)),
  ];
  for (const g of groups) if (g.length > 0) return g[0];
  return null;
}

async function findVideo(task) {
  const base = `${task.code} ${task.session} ${task.year}`;
  const queries =
    task.subject === "mathematics"
      ? [`${base} mr hassan maths walkthrough`, `${base} walkthrough`]
      : [`${base} walkthrough`, `${base} solutions`, base];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const candidates = [];
      for (const q of queries) {
        candidates.push(...(await fx(q)));
      }
      const video = pick(task, candidates);
      if (video) return video;
      // Successful parse but no videos at all — likely a throttled empty page,
      // so retry rather than caching NOT FOUND.
      console.log(`  attempt ${attempt + 1}: 0 results for ${task.key}`);
    } catch (e) {
      console.log(`  attempt ${attempt + 1} error: ${e.message}`);
    }
    await sleep(3000 + attempt * 5000);
  }
  return null;
}

async function main() {
  const codeFilter = process.argv[2]
    ? process.argv[2].replace(/^--codes=/, "").split(",").map((s) => s.trim())
    : null;
  const output = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
  const tasks = buildTasks(codeFilter);
  const pending = tasks.filter((t) => !output[t.key]);
  console.log(`total unique papers: ${tasks.length}, pending: ${pending.length}`);

  let done = 0;
  let index = 0;
  const CONCURRENCY = 3;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= pending.length) return;
      const task = pending[i];
      let video = null;
      try {
        video = await findVideo(task);
      } catch (e) {
        console.log(`  worker error for ${task.key}: ${e.message}`);
      }
      output[task.key] = video ? { i: video.id, t: video.title, c: video.channel } : null;
      done++;
      if (done % 10 === 0) writeFileSync(OUT_FILE, JSON.stringify(output, null, 0));
      console.log(`[${done}/${pending.length}] ${task.key} -> ${video ? output[task.key].i : "NOT FOUND"}`);
      await sleep(300 + Math.random() * 300);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 0));
  const found = Object.values(output).filter(Boolean).length;
  console.log(`done. ${found}/${tasks.length} videos found.`);
}

main().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});
