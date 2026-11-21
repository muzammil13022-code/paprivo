import type { NextRequest } from "next/server";

/**
 * Inline PDF proxy for hosts that serve their files as an attachment.
 *
 * Only the hosts the catalogue already links to are accepted, so this cannot be
 * used as an open proxy. The response is always inline, which is what makes the
 * document open in a new tab instead of downloading.
 */
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

function unavailable(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
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

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "user-agent": UA, accept: "application/pdf,*/*" },
      redirect: "follow",
    });
  } catch {
    return unavailable(502, "Could not reach the document host");
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.includes("pdf") || !upstream.body) {
    if (upstream.body) await upstream.body.cancel();
    return unavailable(404, "Document unavailable");
  }

  const name = (decodeURIComponent(target.pathname.split("/").pop() ?? "") || "paper.pdf").replace(
    /[^\w.-]+/g,
    "_",
  );

  return new Response(upstream.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
}
