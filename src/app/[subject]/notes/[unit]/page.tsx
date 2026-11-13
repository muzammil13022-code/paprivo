import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS } from "@/lib/subjects";
import {
  notesPdfsOf,
  topicalBankUrl,
  topicUnitOf,
  topicUnitsOf,
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
    title: `${meta.label} ${unitData.code} revision notes`,
    description: `Downloadable revision notes for ${unitData.name} (${unitData.code}), Pearson Edexcel IAL — spec topic by topic.`,
  };
}

export default async function NotesUnitPage({ params }: Props) {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) notFound();
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) notFound();

  const meta = SUBJECTS[subject];
  const pdfs = notesPdfsOf(unitData.code);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">
          <Link href={`/${subject}`} className="hover:underline">
            {meta.label}
          </Link>{" "}
          ·{" "}
          <Link href={`/${subject}/notes`} className="hover:underline">
            Revision notes
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {unitData.name}{" "}
          <span className="text-sm font-normal text-muted align-middle">({unitData.code})</span>
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Full notes for this unit, split by specification topic. Each file opens as a PDF, then
          move on to{" "}
          <Link href={`/${subject}/topical/${unitData.code.toLowerCase()}`} className="underline">
            topical practice
          </Link>{" "}
          or the{" "}
          <Link href={`/${subject}/videos`} className="underline">
            video library
          </Link>
          .
        </p>
      </header>

      <section aria-labelledby="notes-pdfs" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="notes-pdfs" className="text-lg font-semibold">
            Notes PDFs
          </h2>
          {pdfs.length > 0 && (
            <span className="text-xs text-muted">
              {pdfs.length} file{pdfs.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {pdfs.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pdfs.map((pdf) => (
              <li key={pdf.url}>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-interactive flex h-full flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-card-sm"
                >
                  <p className="font-medium leading-snug">{pdf.title}</p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">{pdf.source}</span>
                    <span className="doc-btn shrink-0">Open PDF ↗</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted">
            No PDF pack is published for this unit yet — use the topic list below and the{" "}
            <a
              href={topicalBankUrl(subject, unitData)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              questions by topic
            </a>{" "}
            bank instead.
          </p>
        )}
      </section>

      <TopicList subject={subject} unit={unitData} />

      <p className="text-xs text-muted">
        Notes PDFs are published by StudyHub IAL and open on their site; Paprivo links to them
        rather than hosting copies.
      </p>
    </div>
  );
}

function TopicList({ subject, unit }: { subject: SubjectKey; unit: TopicUnit }) {
  return (
    <section aria-labelledby="unit-topics" className="space-y-3">
      <h2 id="unit-topics" className="text-lg font-semibold">
        What this unit covers
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {unit.topics.map((topic, i) => (
          <li
            key={topic.name}
            className="flex items-start gap-3 rounded-xl border border-card-border bg-card p-3 text-sm shadow-card-sm"
          >
            <span className="text-xs text-muted tabular-nums pt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1 leading-snug">{topic.name}</span>
          </li>
        ))}
      </ul>
      <Link href={`/${subject}/topical/${unit.code.toLowerCase()}`} className="doc-btn inline-flex">
        Practise these topics ↗
      </Link>
    </section>
  );
}
