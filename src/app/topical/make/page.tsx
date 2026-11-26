import type { Metadata } from "next";
import Link from "next/link";
import catalog from "@/data/topical-catalog.json";
import { TopicalMaker, type TopicalUnitOption } from "@/components/TopicalMaker";

export const metadata: Metadata = {
  title: "Make a topical",
  description:
    "Build your own IAL topical: every past-paper question on the topics you pick, with the mark schemes, in one PDF. Mathematics, Physics, Chemistry and Biology.",
};

const SUBJECT_ORDER = ["mathematics", "physics", "chemistry", "biology"];

export default function MakeTopicalPage() {
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
  const questionCount = units.reduce((n, u) => n + u.questions, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">
          <Link href="/topical" className="hover:underline">
            Topical practice
          </Link>{" "}
          · Make a topical
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent2-bright">Question bank</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Make a topical
            </h1>
          </div>
          <p className="mark mark-bracket text-sm text-muted" aria-hidden>
            {paperCount} papers
          </p>
        </div>
        <p className="max-w-2xl text-muted">
          Pick a unit and its topics, set the years, and get one PDF of every past-paper question on
          those topics — newest first, each page stamped with the paper it came from. Add the mark
          schemes and you have a full revision pack in a couple of minutes.
        </p>
        <p className="max-w-2xl text-xs text-muted">
          {questionCount.toLocaleString("en-GB")} questions indexed across {units.length} units. Papers
          whose question boundaries cannot be read exactly are left out rather than guessed — a topic
          may therefore have fewer questions listed than the full archive holds.
        </p>
      </header>

      <TopicalMaker units={units} />
    </div>
  );
}

function subjectLabelOf(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
