/**
 * Lists Mr Hassaan's Maths Channel videos for each Edexcel IAL pure maths
 * topic (P1–P4), so the library picks can be chosen by hand.
 *
 * Usage: node scripts/find-hassaan-videos.mjs
 */
const CHANNEL = "UCTFUlHukTAHgjhS2HT6jNWg";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const TOPICS = [
  ["WMA11", "P1", "Algebraic expressions", "indices surds"],
  ["WMA11", "P1", "Equations and inequalities", "quadratics inequalities"],
  ["WMA11", "P1", "Graphs and transformations", "graph transformations"],
  ["WMA11", "P1", "Trigonometry", "trigonometry sine rule graphs"],
  ["WMA12", "P2", "Proof", "proof"],
  ["WMA12", "P2", "Algebra and functions", "algebra functions factor theorem"],
  ["WMA12", "P2", "Coordinate geometry", "coordinate geometry circles"],
  ["WMA12", "P2", "Sequences and series", "sequences series binomial"],
  ["WMA12", "P2", "Radians and trigonometry", "radians arc sector"],
  ["WMA12", "P2", "Exponentials and logarithms", "exponentials logarithms"],
  ["WMA13", "P3", "Algebra and functions", "partial fractions functions"],
  ["WMA13", "P3", "Trigonometry", "trigonometry identities"],
  ["WMA13", "P3", "Exponentials and logarithms", "exponentials logarithms"],
  ["WMA13", "P3", "Differentiation", "differentiation"],
  ["WMA13", "P3", "Integration", "integration"],
  ["WMA13", "P3", "Numerical methods", "numerical methods trapezium"],
  ["WMA14", "P4", "Algebra and functions", "partial fractions binomial"],
  ["WMA14", "P4", "Trigonometry", "trigonometry"],
  ["WMA14", "P4", "Parametric equations", "parametric equations"],
  ["WMA14", "P4", "Differentiation", "differentiation implicit"],
  ["WMA14", "P4", "Integration", "integration substitution parts"],
  ["WMA14", "P4", "Vectors", "vectors"],
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
  for (const [unit, paper, topic, keywords] of TOPICS) {
    const ids = await search(`${paper} ${keywords}`);
    const found = (await Promise.allSettled(ids.map(meta)))
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);
    console.log(`\n== ${unit} ${paper} ${topic}`);
    for (const v of found) console.log(`   ${v.id}  ${v.title}  [${v.channel}]`);
  }
}

main();
