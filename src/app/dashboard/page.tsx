"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserState } from "@/lib/state";
import { catalogueSubject, paperCountOf, subjectList, SUBJECTS } from "@/lib/subjects";
import { paperId } from "@/lib/papers";
import type { Paper, Subject } from "@/types";
import { ProgressRing } from "@/components/ProgressRing";

function nextUpPapers(subject: Subject, progress: Set<string>, limit = 4): Paper[] {
  const out: Paper[] = [];
  for (const unit of subject.units) {
    for (const p of unit.papers) {
      if (!progress.has(paperId(p.code, p.session, p.year, p.variant))) out.push(p);
    }
  }
  // papers list is newest-first; "next up" = most recent undone, prefer June papers
  out.sort((a, b) => (b.year - a.year) || (a.session === "June" ? -1 : 1));
  return out.slice(0, limit);
}

export default function DashboardPage() {
  const { loading, signedIn, name, email, subjectKeys, progress, bookmarks } = useUserState();

  const stats = useMemo(() => {
    const keys = subjectKeys.length > 0 ? subjectKeys : subjectList.map((s) => s.key);
    const perSubject = keys
      .map((key) => {
        const subject = catalogueSubject(key);
        if (!subject) return null;
        const total = paperCountOf(key);
        let done = 0;
        for (const unit of subject.units) {
          for (const p of unit.papers) {
            if (progress.has(paperId(p.code, p.session, p.year, p.variant))) done++;
          }
        }
        return { key, subject, total, done };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return perSubject;
  }, [subjectKeys, progress]);

  const bookmarked = useMemo(() => {
    const rows: Array<{ id: string; code: string; session: string; year: number; variant: string | null; subjectKey: string }> = [];
    for (const id of bookmarks) {
      const [code, session, yearStr, variant] = id.split("|");
      const subject = papersSubjectOf(code);
      rows.push({ id, code, session, year: Number(yearStr), variant: variant || null, subjectKey: subject ?? "mathematics" });
    }
    rows.sort((a, b) => b.year - a.year);
    return rows;
  }, [bookmarks]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-card rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-card border border-card-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {signedIn ? `Welcome back${name ? `, ${name}` : ""}` : "Your dashboard"}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {signedIn
            ? email
            : "You're browsing as a guest — progress is saved in this browser. Sign up to sync it across devices."}
        </p>
        {!signedIn && (
          <Link
            href="/signup"
            className="inline-block mt-3 h-9 px-4 leading-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-soft"
          >
            Create a free account
          </Link>
        )}
      </header>

      <section>
        <h2 className="font-semibold mb-3">Progress by subject</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ key, subject, total, done }) => {
            const meta = SUBJECTS[key];
            const next = nextUpPapers(subject, progress, 3);
            return (
            <div key={key} className="rounded-2xl border border-card-border bg-card p-5">
              <div className="flex items-center gap-4">
                <ProgressRing done={done} total={total} />
                <div className="min-w-0">
                  <Link href={`/${key}`} className="font-semibold hover:underline">
                    {meta.label}
                  </Link>
                  <p className="text-sm text-muted">
                    {done}/{total} papers done
                  </p>
                </div>
              </div>
              {next.length > 0 && (
                <div className="mt-4 pt-3 border-t border-card-border">
                  <p className="text-xs font-medium text-muted mb-2">Next up</p>
                  <ul className="space-y-1 text-sm">
                    {next.map((p) => (
                      <li key={paperId(p.code, p.session, p.year, p.variant)} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {p.session} {p.year} · {p.code}
                          {p.variant ? ` (${p.variant})` : ""}
                        </span>
                        {p.qp && (
                          <a href={p.qp.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent2-bright text-sm shrink-0">
                            Open
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Bookmarked papers</h2>
        {bookmarked.length === 0 ? (
          <p className="text-sm text-muted">
            No bookmarks yet — tap ☆ on any paper to pin it here.{" "}
            <Link href="/mathematics" className="underline underline-offset-2 hover:text-accent2-bright">
              Browse maths papers
            </Link>
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {bookmarked.map((b) => (
              <li key={b.id} className="rounded-xl border border-card-border bg-card p-3 text-sm flex items-center justify-between gap-2">
                <span className="truncate">
                  <span className="font-medium">{b.code}</span> · {b.session} {b.year}
                  {b.variant ? ` (${b.variant})` : ""}
                </span>
                <Link href={`/${b.subjectKey}`} className="underline underline-offset-2 hover:text-accent2-bright shrink-0">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function papersSubjectOf(code: string): string | null {
  if (code.startsWith("WMA") || code.startsWith("WME") || code.startsWith("WST")) return "mathematics";
  if (code.startsWith("WPH")) return "physics";
  if (code.startsWith("WCH")) return "chemistry";
  if (code.startsWith("WBI")) return "biology";
  return null;
}
