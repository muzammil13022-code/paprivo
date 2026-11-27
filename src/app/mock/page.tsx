import type { Metadata } from "next";
import Link from "next/link";
import catalog from "@/data/topical-catalog.json";
import { MockTestMaker } from "@/components/MockTestMaker";
import type { TopicalUnitOption } from "@/components/TopicalMaker";

export const metadata: Metadata = {
  title: "Mock test",
  description:
    "Sit a mock under exam conditions: pick whole specification sections or single specification points, or take whole past papers, set a mark target, and open the paper in a new tab. Mathematics, Physics, Chemistry and Biology.",
};

const SUBJECT_ORDER = ["mathematics", "physics", "chemistry", "biology"];

export default function MockTestPage() {
  const units: TopicalUnitOption[] = Object.entries(catalog.units)
    .map(([code, unit]) => ({
      code,
      name: unit.name,
      subject: unit.subject,
      subjectLabel: subjectLabelOf(unit.subject),
      papers: unit.papers,
      questions: unit.questions,
      topics: unit.topics,
    }))
    .sort(
      (a, b) =>
        SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject) ||
        a.code.localeCompare(b.code),
    );

  const paperCount = units.reduce((n, u) => n + u.papers, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">
          <Link href="/topical" className="hover:underline">
            Topical practice
          </Link>{" "}
          · Mock test
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent2-bright">Exam conditions</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Mock test</h1>
          </div>
          <p className="mark mark-bracket text-sm text-muted" aria-hidden>
            {paperCount} papers
          </p>
        </div>
        <p className="max-w-2xl text-muted">
          Build a paper you can sit in one go. Pick whole sections of the specification, or open a
          section and take one line of it at a time, then set a mark total — or take whole past papers
          exactly as printed. The PDF opens in a new tab, on a timer, with nothing in front of you but
          the questions.
        </p>
        <p className="max-w-2xl text-xs text-muted">
          Mark schemes are left out by default, so the paper you open is just the questions. Add them
          when you are ready to mark, or build a topical on the same sections and points afterwards.
        </p>
      </header>

      <MockTestMaker units={units} />
    </div>
  );
}

function subjectLabelOf(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
