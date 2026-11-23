/**
 * Paper PDF links.
 *
 * A paper link opens the PDF in a new tab. Every document goes through /api/doc
 * for two reasons: hosts that send the file as an attachment then open in the
 * viewer instead of downloading, and the saved file carries the paper's own name
 * ("Mathematics - Pure Mathematics 1 (WMA11) - 2026 June - Question Paper.pdf")
 * rather than a hashed path or a Pearson file name.
 */

export type DocKind = "qp" | "ms" | "er";

const KIND_LABEL: Record<DocKind, string> = {
  qp: "Question Paper",
  ms: "Mark Scheme",
  er: "Examiner Report",
};

export interface PaperNameParts {
  /** Subject label, e.g. "Mathematics" */
  subjectLabel: string;
  /** Unit code, e.g. "WMA11" */
  unitCode: string;
  /** Unit name, e.g. "Pure Mathematics 1" */
  unitName?: string | null;
  session: string;
  year: number;
  variant?: string | null;
  kind: DocKind;
}

/** Drop the characters Windows and macOS reject in file names. */
function tidy(value: string): string {
  return value
    .replace(/[<>:"/\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Subject - Unit - Year Session - kind, e.g. `Mathematics - Pure Mathematics 1 (WMA11) - 2026 June - Question Paper.pdf` */
export function docFileName(parts: PaperNameParts): string {
  const unitName = tidy(parts.unitName ?? "");
  const bits = [
    tidy(parts.subjectLabel),
    unitName ? `${unitName} (${parts.unitCode})` : parts.unitCode,
    `${parts.year} ${tidy(parts.session)}`.trim(),
    parts.variant ? `Variant ${parts.variant}` : "",
    KIND_LABEL[parts.kind],
  ].filter(Boolean);
  return `${bits.join(" - ")}.pdf`;
}

function withPage(url: string, page?: number | null): string {
  return page && page > 0 ? `${url}#page=${page}` : url;
}

/** A link that opens `url` in the PDF viewer, saved as `name`, at `page` when known. */
export function previewHref(
  url: string,
  options: { page?: number | null; name?: string } = {},
): string {
  const params = new URLSearchParams({ u: url });
  if (options.name) params.set("name", options.name);
  return withPage(`/api/doc?${params.toString()}`, options.page);
}
