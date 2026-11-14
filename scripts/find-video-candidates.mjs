/**
 * Prints candidate YouTube videos for each topic section that currently has
 * no verified pick, so the final choice can be made by hand.
 *
 * Usage: node scripts/find-video-candidates.mjs [group]
 *   group: "sections" (default) | "maths"
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const SECTION_QUERIES = [
  ["WCH12", "chem-topic-8", "Edexcel IAL chemistry redox reactions group 2 group 7 revision"],
  ["WCH13", "chem-practical-1", "Edexcel IAL chemistry unit 3 practical skills exam technique"],
  ["WCH14", "chem-topic-12", "entropy and Gibbs free energy A level chemistry Edexcel"],
  ["WCH14", "chem-topic-13", "chemical equilibria Kc A level chemistry Edexcel"],
  ["WCH15", "chem-topic-17", "transition metals A level chemistry Edexcel"],
  ["WCH15", "chem-topic-20", "organic synthesis A level chemistry Edexcel IAL"],
  ["WCH16", "chem-practical-2", "Edexcel IAL chemistry unit 6 practical skills exam technique"],
  ["WPH13", "physics-practical-1", "Edexcel IAL physics unit 3 practical skills exam technique"],
  ["WPH14", "physics-topic-7", "nuclear and particle physics A level Edexcel IAL"],
  ["WPH15", "physics-topic-11", "astrophysics and cosmology A level physics Edexcel IAL"],
  ["WPH16", "physics-practical-2", "Edexcel IAL physics unit 6 practical skills exam technique"],
  ["WBI13", "bio-practical-1", "Edexcel IAL biology unit 3 practical skills exam technique"],
  ["WBI14", "bio-topic-5", "energy flow ecosystems A level biology Edexcel IAL"],
  ["WBI15", "bio-topic-8", "coordination response gene technology A level biology Edexcel IAL"],
  ["WBI16", "bio-practical-2", "Edexcel IAL biology unit 6 practical skills exam technique"],
];

const MATHS_QUERIES = [
  ["WME03", "variable acceleration mechanics A level maths Edexcel"],
  ["WME03", "elastic strings and springs mechanics A level maths"],
  ["WME03", "simple harmonic motion A level maths mechanics"],
  ["WME03", "centres of mass A level maths mechanics"],
  ["WST03", "combinations of random variables A level statistics"],
  ["WST03", "sampling distributions A level statistics"],
  ["WST03", "estimation and confidence intervals A level statistics"],
  ["WST03", "chi-squared tests A level statistics"],
  ["WST03", "hypothesis test for the mean A level statistics"],
];

const REST_QUERIES = [
  ["WPH16", "physics-practical-2", "Edexcel IAL physics unit 6 practical skills revision"],
  ["WBI13", "bio-practical-1", "Edexcel IAL biology unit 3 practical skills revision"],
  ["WBI14", "bio-topic-5", "Edexcel IAL biology unit 4 energy flow ecosystems"],
  ["WBI15", "bio-topic-8", "Edexcel IAL biology unit 5 coordination response gene technology"],
  ["WBI16", "bio-practical-2", "Edexcel IAL biology unit 6 practical skills revision"],
  ["WME03", "", "Edexcel IAL Mechanics 3 WME03 simple harmonic motion"],
  ["WME03", "", "Edexcel IAL Mechanics 3 WME03 centres of mass"],
  ["WME03", "", "Edexcel IAL Mechanics 3 WME03 elastic strings Springs"],
  ["WST03", "", "WST03 S3 combinations of random variables Edexcel"],
  ["WST03", "", "WST03 S3 estimation confidence intervals Edexcel"],
  ["WST03", "", "WST03 S3 chi squared test Edexcel"],
  ["WST03", "", "WST03 S3 hypothesis test for the mean Edexcel"],
  ["WST03", "", "WST03 S3 sampling distribution Edexcel statistics 3"],
];

const M3S3_QUERIES = [
  ["WME03", "", "Bicen Maths simple harmonic motion further mechanics 2"],
  ["WME03", "", "Bicen Maths centres of mass further mechanics"],
  ["WME03", "", "Bicen Maths elastic strings and springs further mechanics"],
  ["WME03", "", "variable acceleration mechanics 3 Edexcel IAL tutorial"],
  ["WST03", "", "linear combinations of random variables A level statistics"],
  ["WST03", "", "chi-squared goodness of fit test A level maths Edexcel"],
  ["WST03", "", "confidence interval for a mean A level maths Edexcel S3"],
  ["WST03", "", "hypothesis test for the mean normal distribution A level maths"],
];

async function search(query, limit = 5) {
  for (const host of ["www.youtube.com", "m.youtube.com"]) {
    try {
      const url = `https://${host}/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
      const res = await fetch(url, {
        headers: { "user-agent": UA, "accept-language": "en" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const ids = [...new Set([...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]))];
      if (ids.length) return ids.slice(0, limit);
    } catch {
      // try the next host
    }
  }
  return [];
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
  const group = process.argv[2] ?? "sections";
  const queries =
    group === "maths"
      ? MATHS_QUERIES.map((q) => [null, null, q])
      : group === "rest"
        ? REST_QUERIES
        : group === "m3s3"
          ? M3S3_QUERIES
          : SECTION_QUERIES;
  for (const [unit, slug, query] of queries) {
    const ids = await search(query);
    const found = (await Promise.allSettled(ids.map(meta)))
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);
    console.log(`\n== ${unit ?? ""} ${slug ?? ""} — ${query}`);
    for (const v of found) console.log(`   ${v.id}  ${v.title}  [${v.channel}]`);
  }
}

main();
