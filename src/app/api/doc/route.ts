import type { NextRequest } from "next/server";

/**
 * Inline PDF proxy for hosts that serve their files as an attachment.
 *
 * Only the hosts the catalogue already links to are accepted, so this cannot be
 * used as an open proxy. The response is always inline, which is what makes the
 * document open in a new tab instead of downloading.
 *
 * alevelcopilot.com throttles each connection to roughly 10 KB/s, so a single
 * stream took minutes for one paper. Range requests are supported, so the file
 * is pulled over several connections at once and released in order.
 */

export const maxDuration = 60;

const ALLOWED_HOSTS = new Set([
  "qualifications.pearson.com",
  "www.alevelcopilot.com",
  "alevelcopilot.com",
  "pmt.physicsandmathstutor.com",
  "edemat.alevelclouds.com",
  "www.mymathscloud.com",
]);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ACCEPT = "application/pdf,*/*";
const CHUNK_SIZE = 128 * 1024;
const MAX_PARALLEL = 6;
const BUDGET_MS = 55_000;

function unavailable(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

function docHeaders(name: string) {
  return {
    "content-type": "application/pdf",
    "content-disposition": `inline; filename="${name}"`,
    "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
  };
}

function fileNameFor(target: URL) {
  return (
    decodeURIComponent(target.pathname.split("/").pop() ?? "").replace(/[^\w.-]+/g, "_") || "paper.pdf"
  );
}

/** Fetch `url` one byte range at a time, retrying once on a transient failure. */
function makeRangeFetcher(url: URL, signal: AbortSignal) {
  return async (start: number, end: number): Promise<Uint8Array> => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": UA, accept: ACCEPT, range: `bytes=${start}-${end}` },
          redirect: "follow",
          signal,
        });
        if (!res.ok || !res.body) {
          if (res.body) await res.body.cancel();
          throw new Error(`range ${start}-${end} responded ${res.status}`);
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        // A server that ignores Range answers 200 with the whole file.
        if (res.status === 206 || end - start + 1 === bytes.byteLength) return bytes;
        throw new Error(`range ${start}-${end} returned an unexpected length`);
      } catch (error) {
        lastError = error;
        if (signal.aborted) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("range request failed");
  };
}

/**
 * Stream the document in order while several ranges download at once, so the
 * first pages reach the browser instead of waiting for the whole file.
 */
function parallelBody(url: URL, total: number, signal: AbortSignal, name: string) {
  const fetcher = makeRangeFetcher(url, signal);
  const starts: number[] = [];
  for (let start = 0; start < total; start += CHUNK_SIZE) starts.push(start);

  const inFlight = new Map<number, Promise<Uint8Array>>();
  let next = 0;
  const pump = () => {
    while (next < starts.length && inFlight.size < MAX_PARALLEL) {
      const index = next++;
      const start = starts[index];
      const end = Math.min(start + CHUNK_SIZE, total) - 1;
      inFlight.set(index, fetcher(start, end));
    }
  };
  pump();

  const body = new ReadableStream<Uint8Array>({
    async start(stream) {
      try {
        for (let index = 0; index < starts.length; index++) {
          pump();
          const pending = inFlight.get(index);
          inFlight.delete(index);
          if (!pending) throw new Error("missing range");
          stream.enqueue(await pending);
        }
        stream.close();
      } catch (error) {
        stream.error(error);
      }
    },
  });

  return new Response(body, { headers: docHeaders(name) });
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) return unavailable(400, "Missing document URL");

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return unavailable(400, "Invalid document URL");
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.host)) {
    return unavailable(403, "Document host not allowed");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  const name = fileNameFor(target);

  // Size and range support come from a cheap HEAD; anything odd falls back to a
  // single plain stream below.
  let total = 0;
  let ranged = false;
  try {
    const head = await fetch(target, {
      method: "HEAD",
      headers: { "user-agent": UA, accept: ACCEPT },
      redirect: "follow",
      signal: controller.signal,
    });
    const type = head.headers.get("content-type") ?? "";
    if (head.ok && type.includes("pdf")) {
      total = Number(head.headers.get("content-length") ?? "0");
      ranged = (head.headers.get("accept-ranges") ?? "").toLowerCase().includes("bytes");
    }
  } catch {
    // No usable HEAD — use the plain path.
  }

  if (ranged && total > CHUNK_SIZE) {
    return parallelBody(target, total, controller.signal, name);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "user-agent": UA, accept: ACCEPT },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return unavailable(502, "Could not reach the document host");
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.includes("pdf") || !upstream.body) {
    if (upstream.body) await upstream.body.cancel();
    clearTimeout(timer);
    return unavailable(404, "Document unavailable");
  }

  // Keep the abort budget alive for the duration of the streamed response.
  const upstreamBody = upstream.body.pipeThrough(
    new TransformStream({
      flush() {
        clearTimeout(timer);
      },
    }),
  );

  return new Response(upstreamBody, { headers: docHeaders(name) });
}
