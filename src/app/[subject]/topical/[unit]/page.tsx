import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS, catalogueSubject } from "@/lib/subjects";
import {
  topicUnitsOf,
  topicUnitOf,
  topicalBankUrl,
  topicalQuestionSearchUrl,
  topicalReviewSearchUrl,
  type TopicUnit,
} from "@/lib/topics";
import type { SubjectKey } from "@/lib/subjects";

interface Props {
  params: Promise<{ subject: string; unit: string }>;
}

export function generateStaticParams() {
  const out: Array<{ subject: string; unit: string }> = [];
  for (const s of ["mathematics", "physics", "chemistry", "biology"] as const) {
    for (const unit of topicUnitsOf(s)) {
      out.push({ subject: s, unit: unit.code.toLowerCase() });
    }
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) return { title: "Not found" };
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) return { title: "Not found" };
  const meta = SUBJECTS[subject];
  return {
    title: `${meta.label} ${unitData.code} topical practice`,
    description: `${unitData.name} (${unitData.code}) IAL topics: practice questions by topic, walkthroughs and notes.`,
  };
}

export default async function TopicalUnitPage({ params }: Props) {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) notFound();
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) notFound();

  const meta = SUBJECTS[subject];
  const catalogue = catalogueSubject(subject);
  const catalogueUnit = catalogue?.units.find((u) => u.code === unitData.code);
  const recentPapers = (catalogueUnit?.papers ?? [])
    .slice()
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);
  const bankUrl = topicalBankUrl(subject, unitData);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">
          <Link href={`/${subject}`} className="hover:underline">
            {meta.label}
          </Link>{" "}
          ·{" "}
          <Link href={`/${subject}/topical`} className="hover:underline">
            Topical practice
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {unitData.name}{" "}
          <span className="text-sm font-normal text-muted align-middle">({unitData.code})</span>
        </h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <a
          className="btn-primary h-9 px-4 text-sm inline-flex items-center"
          href={bankUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Questions by topic ↗
        </a>
        <a
          className="doc-btn h-9 inline-flex items-center"
          href={topicalReviewSearchUrl(unitData)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Full-paper walkthroughs 🎥
        </a>
        <Link
          className="doc-btn h-9 inline-flex items-center"
          href={`/${subject}/notes/${unitData.code.toLowerCase()}`}
        >
          Revision notes for this unit
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Topics</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {unitData.topics.map((topic) => (
            <TopicCard
              key={topic.name}
              subject={subject}
              unit={unitData}
              name={topic.name}
              firstNote={topic.notes[0]}
            />
          ))}
        </ul>
      </section>

      {recentPapers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Try it in a real paper</h2>
          <p className="text-sm text-muted max-w-2xl">
            The newest {unitData.code} papers — most topics appear somewhere in every session.
          </p>
          <ul className="space-y-2">
            {recentPapers.map((paper) => (
              <li key={`${paper.session}-${paper.year}-${paper.variant ?? ""}`}>
                <a
                  className="card-interactive flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-3 shadow-card-sm"
                  href={paper.qp?.url ?? paper.ms?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="font-medium">
                    {paper.session} {paper.year}
                    {paper.variant ? ` · Variant ${paper.variant}` : ""}
                  </span>
                  <span className="text-xs text-muted">Question paper PDF ↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            All {unitData.code} sessions are on the{" "}
            <Link href={`/${subject}`} className="underline">
              {meta.label} page
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TopicCard({
  subject,
  unit,
  name,
  firstNote,
}: {
  subject: SubjectKey;
  unit: TopicUnit;
  name: string;
  firstNote?: string;
}) {
  return (
    <li className="card-interactive rounded-xl border border-card-border bg-card p-4 shadow-card-sm">
      <p className="font-medium">{name}</p>
      {firstNote && <p className="text-sm text-muted mt-1">{firstNote}</p>}
      <div className="mt-3 flex gap-2">
        <a
          className="doc-btn"
          href={topicalQuestionSearchUrl(unit, name)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Walkthroughs 🎥
        </a>
        <Link
          className="doc-btn"
          href={`/${subject}/notes/${unit.code.toLowerCase()}#${slugify(name)}`}
        >
          Notes
        </Link>
      </div>
    </li>
  );
}
