import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { SUBJECTS, SUBJECT_ORDER, catalogueSubject, paperCountOf } from "@/lib/subjects";
import { Reveal } from "@/components/Reveal";

export function generateStaticParams() {
  return SUBJECT_ORDER.map((subject) => ({ subject }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string }>;
}): Promise<Metadata> {
  const { subject } = await params;
  if (!SUBJECT_ORDER.includes(subject as never)) return { title: "Not found" };
  const meta = SUBJECTS[subject as keyof typeof SUBJECTS];
  return {
    title: `${meta.label} resources`,
    description: `${meta.label} International A Level resources: past papers, textbooks and mark schemes for Pearson Edexcel IAL.`,
  };
}

export default async function SubjectResourcePage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  if (!SUBJECT_ORDER.includes(subject as never)) notFound();
  const meta = SUBJECTS[subject as keyof typeof SUBJECTS];
  const catalogue = catalogueSubject(subject as keyof typeof SUBJECTS);
  const paperCount = paperCountOf(subject as keyof typeof SUBJECTS);

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-accent/20 blur-[110px] pointer-events-none"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              <Link href="/resources" className="hover:text-accent2-bright underline underline-offset-2">
                Resource Library
              </Link>{" "}
              / {meta.label}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">{meta.label}</h1>
            <p className="text-muted mt-2 max-w-2xl">{meta.blurb}. {meta.unitsLine}.</p>
          </div>
          <span className="text-5xl text-accent opacity-70" aria-hidden>
            {meta.glyph}
          </span>
        </div>
      </header>

      {/* Papers entry point — the existing experience, untouched */}
      <Reveal>
        <section className="card-interactive rounded-2xl border border-card-border bg-card p-5 sm:p-6 shadow-card-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Past papers &amp; mark schemes</h2>
              <p className="text-sm text-muted mt-0.5">
                {catalogue
                  ? `${paperCount} real papers, 2019–2026, with progress tracking and bookmarks.`
                  : "First exams June 2027 — no past papers exist yet. Sample materials are available below."}
              </p>
            </div>
            {catalogue && (
              <Link href={`/${subject}`} className="btn-primary h-10 px-5 text-sm shrink-0">
                Browse {meta.label} papers
              </Link>
            )}
          </div>
        </section>
      </Reveal>

      {/* Per-subject resource library (search + filters scoped to this subject) */}
      <Suspense fallback={<div className="h-40 rounded-3xl bg-card/5 border border-white/10 animate-pulse" />}>
        <ResourceLibrary initialSubject={subject} />
      </Suspense>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted leading-relaxed">
        <p>
          <strong className="text-foreground">Only real, verified resources.</strong> Paprivo never
          lists material it cannot link to legitimately — papers link to qualifications.pearson.com
          and textbooks to the PaperLords archive. Categories fill in as verified resources are
          added.
        </p>
      </section>
    </div>
  );
}
