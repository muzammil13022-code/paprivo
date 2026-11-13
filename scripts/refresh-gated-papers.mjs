/**
 * Replaces "sign-in" paper links.
 *
 * Pearson serves recent IAL papers from /content/dam/secure/silver/... which
 * returns 401 unless you are logged in, while the same files are published on
 * the open /content/dam/pdf/International-Advanced-Level/... mount. This script
 * rewrites every gated link onto that mount, checks the file really is a PDF,
 * and clears the `gated` flag for the ones that resolve.
 *
 * Usage:
 *   node scripts/refresh-gated-papers.mjs          # report only
 *   node scripts/refresh-gated-papers.mjs --apply  # write papers.json
 */
import { readFile, writeFile } from "node:fs/promises";

const DATA = "src/data/papers.json";
const UA = "Mozilla/5.0 (compatible; Paprivo research)";
const SITE = "https://qualifications.pearson.com";

const SUBJECT_FOLDER = {
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

/** secure/silver/all-uk-and-international/... -> pdf/International-Advanced-Level/... */
function publicUrl(url) {
  const m = url.match(
    /\/content\/dam\/secure\/silver\/all-uk-and-international\/international-advanced-level\/([^/]+)\/([^/]+)\/exam-materials\/(.+)$/,
  );
  if (!m) return null;
  const [, subject, year, file] = m;
  const folder = SUBJECT_FOLDER[subject];
  if (!folder) return null;
  return `${SITE}/content/dam/pdf/International-Advanced-Level/${folder}/${year}/Exam-materials/${file}`;
}

async function isPdf(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    const type = res.headers.get("content-type") ?? "";
    await res.body?.cancel?.();
    return res.ok && type.includes("pdf");
  } catch {
    return false;
  }
}

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

async function main() {
  const apply = process.argv.includes("--apply");
  const data = JSON.parse(await readFile(DATA, "utf8"));

  const gated = [];
  for (const subject of data.subjects) {
    for (const unit of subject.units) {
      for (const paper of unit.papers) {
        for (const kind of ["qp", "ms", "er"]) {
          const entry = paper[kind];
          if (!entry?.gated) continue;
          gated.push({ subject: subject.key, unit: unit.code, paper, kind, entry });
        }
      }
    }
  }
  console.log(`gated links: ${gated.length}`);

  const results = { fixed: 0, missing: [], byKind: { qp: [0, 0], ms: [0, 0], er: [0, 0] } };
  await mapLimit(gated, 8, async (item) => {
    const candidate = publicUrl(item.entry.url);
    const ok = candidate ? await isPdf(candidate) : false;
    results.byKind[item.kind][ok ? 0 : 1] += 1;
    if (ok) {
      results.fixed += 1;
      if (apply) {
        item.entry.url = candidate;
        item.entry.gated = false;
      }
    } else {
      results.missing.push(`${item.unit} ${item.paper.session} ${item.paper.year}${item.paper.variant ? "/" + item.paper.variant : ""} ${item.kind}`);
    }
  });

  for (const [kind, [ok, bad]] of Object.entries(results.byKind)) {
    console.log(`  ${kind}: ${ok} resolvable, ${bad} still gated`);
  }
  if (results.missing.length) {
    console.log(`still gated:\n  ${results.missing.slice(0, 12).join("\n  ")}${results.missing.length > 12 ? `\n  … ${results.missing.length - 12} more` : ""}`);
  }

  if (apply && results.fixed > 0) {
    await writeFile(DATA, JSON.stringify(data, null, 2) + "\n");
    console.log(`updated ${DATA}: ${results.fixed} links now open`);
  } else if (!apply) {
    console.log("report only — rerun with --apply to write the changes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
