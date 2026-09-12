"use client";

import Link from "next/link";
import { catalogueSubject, paperCountOf, subjectList, CS_RESOURCES } from "@/lib/subjects";
import { paperId } from "@/lib/papers";
import type { Subject } from "@/types";
import { useUserState } from "@/lib/state";
import { ProgressRing } from "@/components/ProgressRing";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-card border border-card-border animate-pulse" />
        ))}
      </div>
    );
  }

  const shown = subjectKeys.length > 0 ? subjectList.filter((s) => subjectKeys.includes(s.key)) : subjectList;
  const personalised = subjectKeys.length > 0;

  return (
    <div>
      {personalised && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            Showing your {shown.length} selected subject{shown.length === 1 ? "" : "s"}
          </p>
          <Link href="/onboarding" className="underline underline-offset-2 hover:text-accent2-bright">
            Edit selection
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((meta) => {
          const subject = catalogueSubject(meta.key);
          const total = paperCountOf(meta.key);
          const done = doneCount(subject, progress);
          const isCS = meta.key === "computer-science";
          return (
            <div
              key={meta.key}
              className="rounded-2xl border border-card-border bg-card p-5 flex flex-col gap-3 hover:border-card-border-strong transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    <Link href={`/${meta.key}`} className="hover:underline">
                      {meta.label}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted">{meta.unitsLine}</p>
                </div>
                <span className="text-2xl" aria-hidden>
                  {meta.glyph}
                </span>
              </div>

              {isCS ? (
                <div className="text-sm text-muted flex-1">
                  <p>
                    The new Pearson Edexcel IAL Computer Science spec (2026) has its first exams in
                    <strong> June 2027</strong> — so there are no past papers yet.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <a className="doc-btn" href={CS_RESOURCES.spec} target="_blank" rel="noopener noreferrer">
                      Specification ↗
                    </a>
                    <a className="doc-btn" href={CS_RESOURCES.sample} target="_blank" rel="noopener noreferrer">
                      Sample materials ↗
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted flex-1">{meta.blurb}</p>
                  <div className="flex items-center gap-3">
                    <ProgressRing done={done} total={total} />
                    <div className="text-sm">
                      <p className="font-medium">
                        {done} of {total} papers done
                      </p>
                      <Link href={`/${meta.key}`} className="underline underline-offset-2 hover:text-accent2-bright">
                        Browse papers
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
