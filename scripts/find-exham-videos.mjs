/**
 * Lists Mr Exham Biology videos for each Edexcel IAL biology topic, so the
 * library picks can be chosen by hand.
 *
 * Usage: node scripts/find-exham-videos.mjs
 */
const CHANNEL = "UCHQBmp572eHNBhvO2xKXBLQ";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const TOPICS = [
  ["WBI11", "Molecules, transport and health", "A Level Biology carbohydrates proteins enzymes heart transport"],
  ["WBI11", "Membranes, proteins, DNA and gene expression", "A Level Biology membranes DNA protein synthesis gene expression"],
  ["WBI12", "Cell structure, reproduction and development", "A Level Biology cells mitosis meiosis reproduction"],
  ["WBI12", "Plant structure, biodiversity and conservation", "A Level Biology plant transport biodiversity conservation"],
  ["WBI13", "Core techniques", "biology core practical microscope practical skills"],
  ["WBI13", "Analysis and evaluation", "biology practical evaluation analysis A Level"],
  ["WBI13", "Statistical tests (light)", "biology statistical tests chi squared t test"],
  ["WBI14", "Energy flow, ecosystems and the environment", "A Level Biology energy flow ecosystems photosynthesis"],
  ["WBI14", "Microbiology, immunity and forensics", "A Level Biology microbiology immunity forensics"],
  ["WBI15", "Respiration, muscles and the internal environment", "A Level Biology respiration muscles homeostasis kidney"],
  ["WBI15", "Coordination, response and gene technology", "A Level Biology coordination response gene technology"],
  ["WBI16", "Advanced practicals", "biology advanced practicals A Level practical skills"],
  ["WBI16", "Statistical tests", "biology statistics A Level practical"],
  ["WBI16", "Evaluation", "biology practical evaluation exam technique"],
];

async function search(query, limit = 4) {
  const url = `https://www.youtube.com/channel/${CHANNEL}/search?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "en" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const ids = [...new Set([...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]))];
    return ids.slice(0, limit);
  } catch {
    return [];
  }
}

async function meta(id) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return { id, title: j.title, channel: j.author_name };
  } catch {
    return null;
  }
}

async function main() {
  for (const [unit, topic, keywords] of TOPICS) {
    const ids = await search(keywords);
    const found = (await Promise.allSettled(ids.map(meta)))
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);
    console.log(`\n== ${unit} ${topic}`);
    for (const v of found) console.log(`   ${v.id}  ${v.title}  [${v.channel}]`);
  }
}

main();
