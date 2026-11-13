import type { Metadata } from "next";
import Link from "next/link";
import { subjectList } from "@/lib/subjects";
import { notesPdfsOf, topicUnitsOf } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Revision notes",
  description:
    "Downloadable revision notes for every Pearson Edexcel IAL unit — Mathematics, Physics, Chemistry and Biology, split by specification topic.",
};

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Revision notes</h1>
        <p className="text-muted mt-1 max-w-2xl">
          Full notes for every unit, split by specification topic and published as PDFs — read
          them offline, then practise the matching questions.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {subjectList.map((subject) => {
          const units = topicUnitsOf(subject.key);
          const pdfCount = units.reduce((n, u) => n + notesPdfsOf(u.code).length, 0);
          return (
            <Link
              key={subject.key}
              href={`/${subject.key}/notes`}
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
                {pdfCount > 0 ? `${pdfCount} notes PDF${pdfCount === 1 ? "" : "s"}` : "Notes PDFs coming soon"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
