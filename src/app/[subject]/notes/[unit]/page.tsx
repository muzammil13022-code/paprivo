import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS } from "@/lib/subjects";
import { topicUnitsOf, topicUnitOf, topicalBankUrl, type TopicUnit } from "@/lib/topics";
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
    description: `Concise revision notes for ${unitData.name} (${unitData.code}), Pearson Edexcel IAL.`,
  };
}

export default async function NotesUnitPage({ params }: Props) {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) notFound();
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) notFound();

  const meta = SUBJECTS[subject];

  return (
    <div className="space-y-6">
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
          Quick-reference notes, one block per specification topic. Skim them before a
          session, then move on to{" "}
          <Link href={`/${subject}/topical/${unitData.code.toLowerCase()}`} className="underline">
            topical practice
          </Link>
          .
        </p>
      </header>

      <div className="space-y-4">
        {unitData.topics.map((topic) => (
          <TopicBlock key={topic.name} subject={subject} unit={unitData} topic={topic} />
        ))}
      </div>

      <p className="text-xs text-muted">
        These are Paprivo's own short summaries — for full explanations and question
        banks, open the{" "}
        <a
          href={topicalBankUrl(subject, unitData)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          notes &amp; questions by topic
        </a>
        .
      </p>
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TopicBlock({
  subject,
  unit,
  topic,
}: {
  subject: SubjectKey;
  unit: TopicUnit;
  topic: { name: string; notes: string[] };
}) {
  return (
    <section
      id={slugify(topic.name)}
      className="rounded-2xl border border-card-border bg-card p-5 shadow-card-sm scroll-mt-24"
    >
      <h2 className="font-semibold">{topic.name}</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        {topic.notes.map((note, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-muted select-none">
              •
            </span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/${subject}/topical/${unit.code.toLowerCase()}`}
        className="doc-btn mt-3 inline-flex"
      >
        Practice this topic
      </Link>
    </section>
  );
}
