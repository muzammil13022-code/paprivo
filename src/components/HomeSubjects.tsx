"use client";

import Link from "next/link";
import { catalogueSubject, paperCountOf, subjectList } from "@/lib/subjects";
import { paperId } from "@/lib/papers";
import type { Subject } from "@/types";
import { useUserState } from "@/lib/state";
import { Reveal } from "@/components/Reveal";

function doneCount(subject: Subject | undefined, progress: Set<string>): number {
  if (!subject) return 0;
  let n = 0;
  for (const unit of subject.units) {
    for (const p of unit.papers) {
      if (progress.has(paperId(p.code, p.session, p.year, p.variant))) n++;
    }
  }
  return n;
}

export function HomeSubjects() {
  const { loading, subjectKeys, progress } = useUserState();

  if (loading) {
    return (
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-white/10 border border-white/10">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-48 bg-background-soft animate-pulse" />
        ))}
      </div>
    );
  }

  const shown =
    subjectKeys.length > 0 ? subjectList.filter((s) => subjectKeys.includes(s.key)) : subjectList;
  const personalised = subjectKeys.length > 0;

  return (
    <div>
      {personalised && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            Showing your {shown.length} selected subject{shown.length === 1 ? "" : "s"}
          </p>
          <Link
            href="/onboarding"
            className="text-sm underline underline-offset-4 decoration-white/30 hover:decoration-accent2-bright"
          >
            Edit selection
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((meta, i) => {
          const subject = catalogueSubject(meta.key);
          const total = paperCountOf(meta.key);
          const done = doneCount(subject, progress);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Reveal key={meta.key} delay={(i % 3) * 70}>
              <div className="card-interactive rounded-2xl border border-card-border bg-card h-full">
                <Link href={`/${meta.key}`} className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      {meta.label}
                    </h3>
                    <span className="mark text-sm text-graphite mark-bracket shrink-0" aria-hidden>
                      {total}
                    </span>
                  </div>
                  <p className="text-xs text-graphite mt-0.5">{meta.unitsLine}</p>

                  <p className="text-sm text-graphite mt-3 flex-1 leading-relaxed">{meta.blurb}</p>

                  {/* Scoring line: filled to the papers you have ticked off */}
                  <div className="mt-5">
                    <div className="h-[3px] w-full bg-rule" role="presentation">
                      <div className="h-full bg-marker" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
                      <span className="mark text-graphite">
                        {done} of {total} ticked off
                      </span>
                      <span className="font-medium text-accent">Browse papers</span>
                    </div>
                  </div>
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
