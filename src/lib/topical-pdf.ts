/**
 * Server-side assembly of a "Make a topical" pack.
 *
 * Client-side merging froze on one upstream mark scheme inside pdf-lib's
 * browser build, so the pack is built here instead: fetch the selected papers
 * through /api/doc (which already does the throttled parallel range download),
 * copy the exact question pages with pdf-lib, stamp each page with its source,
 * and optionally append the whole mark scheme for every paper used.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  paperLabel,
  topicalPackName,
  type TopicalMatch,
  type TopicalSelection,
  type TopicalUnitIndex,
} from "@/lib/topical";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const STAMP_SIZE = 6.5;

export interface PackResult {
  bytes: Uint8Array;
  name: string;
  pages: number;
  skipped: string[];
}

/** Rejects rather than waiting forever on a stalled document host. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);
}

async function fetchDoc(origin: string, url: string): Promise<Uint8Array> {
  const target = new URL(`/api/doc?u=${encodeURIComponent(url)}`, origin);
  const res = await withTimeout(fetch(target, { cache: "no-store" }), 50_000, "document download");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await withTimeout(res.arrayBuffer(), 50_000, "document body"));
}

/** Load documents with a small amount of concurrency, keeping order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index]);
      }
    }),
  );
  return out;
}

export async function buildPack(
  origin: string,
  index: TopicalUnitIndex,
  selection: TopicalSelection,
  match: TopicalMatch,
  topicNames: string[],
): Promise<PackResult> {
  const ink = rgb(0.11, 0.12, 0.1);
  const graphite = rgb(0.42, 0.41, 0.35);
  const marker = rgb(0.66, 0.14, 0.11);
  const rule = rgb(0.82, 0.79, 0.71);
  const paper = rgb(0.97, 0.95, 0.91);

  const out = await PDFDocument.create();
  const body = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  out.setTitle(`Paprivo topical - ${index.subjectLabel} ${index.name} (${index.unit})`);
  out.setSubject(topicNames.join(", "));
  out.setCreator("Paprivo");

  const wrap = (text: string, size: number, width: number, font = body): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  const cover = out.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: paper });
  cover.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 92,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 2,
    color: marker,
  });

  let y = PAGE_HEIGHT - 122;
  cover.drawText("PAPRIVO - TOPICAL PRACTICE", { x: MARGIN, y, size: 8.5, font: bold, color: marker });
  y -= 34;
  for (const line of wrap(index.name, 25, PAGE_WIDTH - MARGIN * 2, bold)) {
    cover.drawText(line, { x: MARGIN, y, size: 25, font: bold, color: ink });
    y -= 31;
  }
  cover.drawText(`${index.subjectLabel} - ${index.unit}`, {
    x: MARGIN,
    y: y - 2,
    size: 11,
    font: body,
    color: graphite,
  });
  y -= 40;

  cover.drawText("TOPICS", { x: MARGIN, y, size: 8.5, font: bold, color: marker });
  y -= 18;
  for (const name of topicNames) {
    for (const line of wrap(name, 11.5, PAGE_WIDTH - MARGIN * 2 - 14)) {
      cover.drawCircle({ x: MARGIN + 2, y: y + 4, size: 1.3, color: marker });
      cover.drawText(line, { x: MARGIN + 12, y, size: 11.5, font: body, color: ink });
      y -= 17;
    }
  }

  y -= 16;
  cover.drawRectangle({ x: MARGIN, y, width: PAGE_WIDTH - MARGIN * 2, height: 0.8, color: rule });
  y -= 30;

  const stats: Array<[string, string]> = [
    [String(match.papers.length), match.papers.length === 1 ? "paper" : "papers"],
    [String(match.questionCount), match.questionCount === 1 ? "question" : "questions"],
    [String(match.marks), "marks"],
    [String(match.pageCount), match.pageCount === 1 ? "question page" : "question pages"],
  ];
  let x = MARGIN;
  for (const [value, label] of stats) {
    cover.drawText(value, { x, y, size: 20, font: bold, color: ink });
    cover.drawText(label, { x, y: y - 14, size: 8, font: body, color: graphite });
    x += 118;
  }

  y -= 62;
  const parts = [
    "Part 1 - the questions, newest paper first. Each page is stamped with the paper and question it belongs to.",
  ];
  if (selection.includeMarkSchemes) {
    parts.push(
      "Part 2 - the complete mark scheme for every paper used, so each question can be checked in its own scheme.",
    );
  }
  if (match.sharedPagePapers > 0) {
    parts.push(
      `${match.sharedPagePapers} paper${match.sharedPagePapers === 1 ? "" : "s"} print several questions on one page (multiple choice); those pages bring their neighbouring questions with them.`,
    );
  }
  for (const paragraph of parts) {
    for (const line of wrap(paragraph, 9.5, PAGE_WIDTH - MARGIN * 2)) {
      cover.drawText(line, { x: MARGIN, y, size: 9.5, font: body, color: graphite });
      y -= 13;
    }
    y -= 6;
  }

  cover.drawText(
    `Built ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    { x: MARGIN, y: 92, size: 9, font: body, color: graphite },
  );
  const disclaimer =
    "Questions reproduced from Pearson Edexcel International A Level past papers for personal revision. Past papers and mark schemes remain the property of Pearson.";
  wrap(disclaimer, 8, PAGE_WIDTH - MARGIN * 2).forEach((line, i) => {
    cover.drawText(line, { x: MARGIN, y: 76 - i * 10, size: 8, font: body, color: graphite });
  });

  const skipped: string[] = [];

  const questionDocs = await mapLimit(match.papers, 6, async (entry) => {
    try {
      const source = await PDFDocument.load(await fetchDoc(origin, entry.paper.qp), {
        ignoreEncryption: true,
      });
      return { entry, source };
    } catch (error) {
      skipped.push(`${paperLabel(entry.paper)} (${error instanceof Error ? error.message : "failed"})`);
      return null;
    }
  });

  for (const item of questionDocs) {
    if (!item) continue;
    const { entry, source } = item;
    const indexes = entry.pages.map((p) => p - 1).filter((i) => i >= 0 && i < source.getPageCount());
    const copied = await out.copyPages(source, indexes);
    copied.forEach((page, i) => {
      const pageNumber = indexes[i] + 1;
      const owners = entry.paper.questions.filter((q) => pageNumber >= q.from && pageNumber <= q.to);
      const label = `${entry.paper.id.replace(/\|/g, " ")} - ${owners.map((q) => `Q${q.q}`).join(", ")}`;
      const { width } = page.getSize();
      page.drawText(label, { x: 34, y: 14, size: STAMP_SIZE, font: body, color: graphite, opacity: 0.85 });
      page.drawLine({
        start: { x: 34, y: 24 },
        end: {
          x: Math.min(width - 34, 34 + body.widthOfTextAtSize(label, STAMP_SIZE) + 6),
          y: 24,
        },
        thickness: 0.4,
        color: graphite,
        opacity: 0.4,
      });
      out.addPage(page);
    });
  }

  if (selection.includeMarkSchemes) {
    const schemes = await mapLimit(
      match.papers.filter((entry) => entry.paper.ms),
      6,
      async (entry) => {
        try {
          const source = await PDFDocument.load(await fetchDoc(origin, entry.paper.ms as string), {
            ignoreEncryption: true,
          });
          return { entry, source };
        } catch (error) {
          skipped.push(
            `mark scheme ${paperLabel(entry.paper)} (${error instanceof Error ? error.message : "failed"})`,
          );
          return null;
        }
      },
    );

    for (const item of schemes) {
      if (!item) continue;
      const { entry, source } = item;
      const copied = await out.copyPages(source, source.getPageIndices());
      for (const page of copied) {
        const label = `${entry.paper.id.replace(/\|/g, " ")} - mark scheme`;
        page.drawText(label, { x: 34, y: 14, size: STAMP_SIZE, font: body, color: graphite, opacity: 0.85 });
        out.addPage(page);
      }
    }
  }

  const bytes = await out.save();
  return {
    bytes,
    name: topicalPackName(index, topicNames),
    pages: out.getPageCount(),
    skipped,
  };
}
