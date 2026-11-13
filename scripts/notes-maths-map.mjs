/**
 * StudyHub IAL's mathematics PDFs are loose files rather than per-unit pages,
 * so they are discovered from the site's sitemap and assigned by file prefix:
 *
 *   p1…p4 → Pure 1–4        m1…m3 → Mechanics 1–3        s1…s3 → Statistics 1–3
 *
 * Topic packs carry their own title in the PDF metadata ("Proof | Edexcel
 * International AS Maths Revision Notes 2018"); question packs do not, which
 * is how they are filtered out. A couple of full-unit guides use their own
 * names and need an explicit entry.
 */
export const UNIT_LABEL = {
  WMA11: "Pure Mathematics 1",
  WMA12: "Pure Mathematics 2",
  WMA13: "Pure Mathematics 3",
  WMA14: "Pure Mathematics 4",
  WME01: "Mechanics 1",
  WME02: "Mechanics 2",
  WME03: "Mechanics 3",
  WST01: "Statistics 1",
  WST02: "Statistics 2",
  WST03: "Statistics 3",
};

export const PREFIX_UNIT = {
  p1: "WMA11",
  p2: "WMA12",
  p3: "WMA13",
  p4: "WMA14",
  m1: "WME01",
  m2: "WME02",
  m3: "WME03",
  s1: "WST01",
  s2: "WST02",
  s3: "WST03",
};

/** Full-unit guides that don't follow the numbered topic naming. */
export const GUIDE_FILES = {
  "p3g.pdf": { unit: "WMA13", title: "Pure Mathematics 3 — revision notes" },
  "m2g.pdf": { unit: "WME02", title: "Mechanics 2 — revision notes" },
};
