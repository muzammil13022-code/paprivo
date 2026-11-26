import type { NextRequest } from "next/server";
import catalog from "@/data/topical-catalog.json";
import { matchQuestions, topicalPackName, type TopicalUnitIndex } from "@/lib/topical";
import { buildPack } from "@/lib/topical-pdf";

/**
 * GET /api/topical?unit=WMA11&topics=differentiation,integration&from=2023
 *                   &to=2026&sessions=June,October&ms=1
 *
 * Builds one PDF: every indexed past-paper question on the chosen topics, in
 * page order, optionally followed by each paper's mark scheme. The heavy
 * lifting (fetching through /api/doc, copying pages) happens here rather than
 * in the browser, where one upstream scheme could stall pdf-lib indefinitely.
 */

export const maxDuration = 60;

// Vercel caps buffered responses at 4.5 MB but not streamed ones, so the pack
// is streamed below. The paper cap keeps a build inside the 60 s function
// budget (mark schemes roughly double the downloads).
const MAX_PAPERS = 34;
const MAX_PAPERS_WITH_MS = 26;

function fail(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const unitCode = (params.get("unit") ?? "").toUpperCase();
  const entry = catalog.units[unitCode as keyof typeof catalog.units];
  if (!entry) return fail(400, "Unknown unit");

  const knownTopics = new Set(entry.topics.map((t) => t.id));
  const topics = (params.get("topics") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => knownTopics.has(t));
  if (topics.length === 0) return fail(400, "Choose at least one topic");

  const fromYear = Number(params.get("from"));
  const toYear = Number(params.get("to"));
  const sessions = (params.get("sessions") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ["January", "June", "October"].includes(s));
  const includeMarkSchemes = params.get("ms") === "1";

  const indexResponse = await fetch(new URL(`/topical-data/${unitCode}.json`, request.nextUrl.origin), {
    cache: "no-store",
  });
  if (!indexResponse.ok) return fail(502, "Could not read the question index");
  const index = (await indexResponse.json()) as TopicalUnitIndex;

  const selection = {
    topics,
    fromYear: Number.isFinite(fromYear) ? fromYear : 0,
    toYear: Number.isFinite(toYear) ? toYear : 9999,
    sessions,
    includeMarkSchemes,
  };
  const match = matchQuestions(index, selection);

  if (match.questionCount === 0) return fail(404, "No questions match that selection");
  const limit = includeMarkSchemes ? MAX_PAPERS_WITH_MS : MAX_PAPERS;
  if (match.papers.length > limit) {
    return fail(
      413,
      `That is ${match.papers.length} papers — narrow the years to ${limit} or fewer${includeMarkSchemes ? ", or turn the mark schemes off" : ""}`,
    );
  }

  const topicNames = entry.topics.filter((t) => topics.includes(t.id)).map((t) => t.name);

  try {
    const pack = await buildPack(request.nextUrl.origin, index, selection, match, topicNames);
    const name = topicalPackName(index, topicNames);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(pack.bytes);
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"`,
        "cache-control": "no-store",
        "x-skipped": String(pack.skipped.length),
      },
    });
  } catch (error) {
    return fail(500, `The pack could not be built: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
