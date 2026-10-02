import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { allResources, countByType } from "@/lib/resources";
import { SUBJECTS, SUBJECT_ORDER } from "@/lib/subjects";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Resource Library",
  description:
    "Past papers, topical papers, textbooks and mark schemes for Pearson Edexcel International AS and A Level — search everything in one place.",
};

export default function ResourcesPage() {
  const total = allResources().length;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-accent/20 blur-[110px] pointer-events-none"
        />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Resource Library</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Past papers, topical papers, textbooks and mark schemes for Pearson Edexcel
            International AS and A Levels — one searchable place, linking only to real, verified
            sources.
          </p>
          <p className="text-sm text-muted mt-1.5">{total} resources listed and growing.</p>
        </div>
      </header>

      <Reveal>
        <Suspense fallback={<div className="h-40 rounded-3xl bg-card/5 border border-white/10 animate-pulse" />}>
          <ResourceLibrary />
        </Suspense>
      </Reveal>

      <section aria-labelledby="browse-by-subject">
        <h2 id="browse-by-subject" className="text-2xl font-bold tracking-tight">
          Browse by subject
        </h2>
        <p className="text-muted mt-1.5 mb-4">Each subject page gathers its papers, textbooks and spec in one view.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECT_ORDER.map((key, i) => {
            const meta = SUBJECTS[key];
            return (
              <Reveal key={key} delay={(i % 3) * 90}>
                <div className="card-interactive rounded-2xl border border-card-border bg-card p-5 shadow-card-sm h-full flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{meta.label}</h3>
                    <span className="card-glyph text-2xl text-accent opacity-80" aria-hidden>
                      {meta.glyph}
                    </span>
                  </div>
                  <p className="text-sm text-muted flex-1">{meta.unitsLine}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded-md bg-card-border/40 text-xs font-medium">
                      {countByType("past-paper", { subject: key })} paper collections
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-card-border/40 text-xs font-medium">
                      {countByType("textbook", { subject: key })} textbook{countByType("textbook", { subject: key }) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Link
                    href={`/resources/${key}`}
                    className="text-accent-soft underline underline-offset-2 hover:text-accent2-bright w-fit"
                  >
                    Open subject page
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </div>
  );
}
