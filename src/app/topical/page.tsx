import type { Metadata } from "next";
import Link from "next/link";
import { subjectList } from "@/lib/subjects";
import { topicUnitsOf } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Topical practice",
  description:
    "Practise Pearson Edexcel IAL questions by specification topic — Mathematics, Physics, Chemistry and Biology.",
};

export default function TopicalPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Topical practice</h1>
        <p className="text-muted mt-1 max-w-2xl">
          Question banks and walkthrough searches grouped by specification topic, unit by
          unit. Pick a subject to begin.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {subjectList.map((subject) => {
          const units = topicUnitsOf(subject.key);
          const topicCount = units.reduce((n, u) => n + u.topics.length, 0);
          return (
            <Link
              key={subject.key}
              href={`/${subject.key}/topical`}
              className="card-interactive rounded-2xl border border-card-border bg-card p-5 shadow-card-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  <span className="mr-2 text-xl" aria-hidden>
                    {subject.glyph}
                  </span>
                  {subject.label}
                </p>
                <span className="text-xs text-muted">{units.length} units</span>
              </div>
              <p className="text-sm text-muted mt-1">
                {topicCount} topics · practice questions &amp; notes
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
