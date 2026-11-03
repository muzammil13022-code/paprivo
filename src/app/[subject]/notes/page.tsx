import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS } from "@/lib/subjects";
import { topicUnitsOf } from "@/lib/topics";

interface Props {
  params: Promise<{ subject: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  if (!isSubjectKey(subject)) return { title: "Not found" };
  const meta = SUBJECTS[subject];
  return {
    title: `${meta.label} revision notes`,
    description: `Short, spec-aligned revision notes for every ${meta.label} IAL unit.`,
  };
}

export default async function NotesHubPage({ params }: Props) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  const meta = SUBJECTS[subject];
  const units = topicUnitsOf(subject);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {meta.label} revision notes
        </h1>
        <p className="text-muted mt-1 max-w-2xl">
          Concise notes for every {meta.label} unit — key ideas, formulas and exam
          phrasing to refresh before practicing questions.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {units.map((unit) => (
          <Link
            key={unit.code}
            href={`/${subject}/notes/${unit.code.toLowerCase()}`}
            className="card-interactive group rounded-2xl border border-card-border bg-card p-5 shadow-card-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{unit.name}</p>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-card-border">
                {unit.code}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">
              {unit.topics.length} topic{unit.topics.length === 1 ? "" : "s"} of notes
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
