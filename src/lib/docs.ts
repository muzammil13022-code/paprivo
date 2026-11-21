/**
 * Paper PDF links.
 *
 * Most sources serve PDFs inline, so a plain link opens in the browser's viewer
 * in a new tab. alevelcopilot.com sends `Content-Disposition: attachment`, which
 * makes the browser save the file instead — those links go through /api/doc,
 * which re-serves the same bytes inline so the preview opens as expected.
 */

const DOWNLOAD_ONLY_HOSTS = new Set(["www.alevelcopilot.com", "alevelcopilot.com"]);

function withPage(url: string, page?: number | null): string {
  return page && page > 0 ? `${url}#page=${page}` : url;
}

/** A link that opens `url` in the PDF viewer, at `page` when one is known. */
export function previewHref(url: string, page?: number | null): string {
  let host: string | null = null;
  try {
    host = new URL(url).host;
  } catch {
    return withPage(url, page); // site-relative file under /public
  }
  if (DOWNLOAD_ONLY_HOSTS.has(host)) {
    return withPage(`/api/doc?u=${encodeURIComponent(url)}`, page);
  }
  return withPage(url, page);
}
