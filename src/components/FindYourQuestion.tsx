"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  findQuestion,
  type QuestionSearchHit,
  type QuestionSearchResult,
} from "@/lib/question-search";
import { Reveal } from "@/components/Reveal";

const EXAMPLES = ["WMA11 June 2024 Q3", "Chemistry WCH12 2023 Q5", "WPH11/24 Q2"];

type Phase = "idle" | "loading" | "done";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function DocButtons({ hit }: { hit: QuestionSearchHit }) {
  const { paper } = hit;
  return (
    <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
      {paper.qp ? (
        <a className="btn-secondary !text-on-card !border-card-border !bg-card hover:!border-accent" href={paper.qp.url} target="_blank" rel="noopener noreferrer">
          View Question Paper
          {paper.qp.gated && <span className="text-xs font-normal text-muted">(Pearson sign-in)</span>}
          <span aria-hidden>↗</span>
        </a>
      ) : (
        <span className="btn-secondary !text-on-card !border-card-border !bg-card opacity-50 cursor-not-allowed">Question paper not in catalogue</span>
      )}
      {paper.ms ? (
        <a className="btn-secondary !text-on-card !border-card-border !bg-card hover:!border-accent" href={paper.ms.url} target="_blank" rel="noopener noreferrer">
          View Mark Scheme
          {paper.ms.gated && <span className="text-xs font-normal text-muted">(Pearson sign-in)</span>}
          <span aria-hidden>↗</span>
        </a>
      ) : (
        <span className="btn-secondary !text-on-card !border-card-border !bg-card opacity-50 cursor-not-allowed">Mark scheme not in catalogue</span>
      )}
    </div>
  );
}

function HitCard({ hit, questionNumber, compact = false }: { hit: QuestionSearchHit; questionNumber: number | null; compact?: boolean }) {
  const { paper } = hit;
  return (
    <div className={`rounded-2xl border border-card-border bg-card shadow-card-sm ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="text-lg font-semibold">{hit.subjectLabel}</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-md text-white" style={{ background: "var(--accent)" }}>
          {hit.unitCode}
        </span>
        {paper.variant && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--accent2-bright)", color: "#fff" }}>
            Variant {paper.variant}
          </span>
        )}
        {questionNumber !== null && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--accent2)", color: "#fff" }}>
            Question {questionNumber}
          </span>
        )}
      </div>

      <p className="text-sm text-muted mt-1.5">
        {paper.session} {paper.year} · {hit.unitName}
      </p>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-4 text-sm border-t border-card-border pt-3">
        <div>
          <dt className="text-xs text-muted">Subject</dt>
          <dd className="font-medium">{hit.subjectLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Unit code</dt>
          <dd className="font-medium">{hit.unitCode}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Session</dt>
          <dd className="font-medium">{paper.session}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Year</dt>
          <dd className="font-medium">{paper.year}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Variant</dt>
          <dd className="font-medium">{paper.variant ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Question</dt>
          <dd className="font-medium">{questionNumber !== null ? String(questionNumber) : "—"}</dd>
        </div>
      </dl>

      <DocButtons hit={hit} />
      {questionNumber !== null && (
        <p className="text-xs text-muted mt-3">
          Question {questionNumber} opens inside this paper&apos;s PDF — numbering follows the paper as printed.
        </p>
      )}
    </div>
  );
}

export function FindYourQuestion() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<QuestionSearchResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || timerRef.current) return;
    setPhase("loading");
    setResult(null);
    // Brief, deliberate pause so the loading state reads as a fast lookup
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setResult(findQuestion(trimmed));
      setResultKey((k) => k + 1);
      setPhase("done");
    }, 450);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const intent = result && result.status !== "none" ? result.intent : result?.intent ?? null;
  const questionNumber = intent?.questionNumber ?? null;

  return (
    <section aria-labelledby="fyq-heading" className="relative overflow-hidden">
      {/* soft blue glow behind the search area */}
      <div aria-hidden className="absolute -inset-x-6 -top-10 bottom-0 pointer-events-none">
        <div className="anim-glow absolute left-1/2 top-0 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-accent/25 blur-[110px]" />
      </div>

      <Reveal className="relative">
        <div className="rounded-3xl border border-white/10 bg-background-soft/80 backdrop-blur p-6 sm:p-8 shadow-glow">
          <h2 id="fyq-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find Your Question
          </h2>
          <p className="text-muted mt-1.5 max-w-2xl">
            Enter a question reference and quickly find the matching Question Paper and Mark Scheme.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-2.5" role="search">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by question reference..."
                aria-label="Search by question reference"
                className="w-full h-12 rounded-xl border border-card-border bg-card text-on-card pl-10 pr-4 text-sm sm:text-base placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/70 transition-shadow"
              />
            </div>
            <button type="submit" disabled={phase === "loading"} className="btn-primary h-12 px-6 text-sm sm:text-base disabled:opacity-70 disabled:cursor-wait">
              {phase === "loading" ? (
                <>
                  <span className="anim-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                  Searching…
                </>
              ) : (
                "Search Question"
              )}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex);
                }}
                className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:border-accent2-bright/60 hover:text-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Results */}
          <div aria-live="polite" className="mt-6">
            {phase === "done" && result && (
              <div key={resultKey} className="anim-rise space-y-3">
                {result.status === "exact" && (
                  <>
                    {questionNumber === null && (
                      <p className="text-sm text-muted">Tip: add a question number (e.g. “Q3”) to jump to the right place in the paper.</p>
                    )}
                    {result.hits.map((hit, i) => (
                      <Reveal key={`${hit.unitCode}-${hit.paper.session}-${hit.paper.year}-${hit.paper.variant ?? ""}-${i}`} delay={i * 60}>
                        <HitCard hit={hit} questionNumber={questionNumber} />
                      </Reveal>
                    ))}
                  </>
                )}

                {result.status === "partial" && (
                  <>
                    <p className="text-sm text-muted font-medium">No exact question found — close matches from the catalogue:</p>
                    {result.hits.map((hit, i) => (
                      <Reveal key={`${hit.unitCode}-${hit.paper.session}-${hit.paper.year}-${i}`} delay={i * 60}>
                        <HitCard hit={hit} questionNumber={questionNumber} compact />
                      </Reveal>
                    ))}
                  </>
                )}

                {result.status === "none" && (
                  <div className="rounded-2xl border border-card-border bg-card p-5 text-on-card">
                    <h3 className="font-semibold">No exact question found</h3>
                    <p className="text-sm text-muted mt-1.5">
                      Paprivo indexes Pearson Edexcel IAL papers (unit codes like WMA11, WCH12, WPH11).
                      Cambridge-style codes (e.g. 0620) aren&apos;t in the catalogue.
                    </p>
                    <p className="text-sm mt-3">Try searching for:</p>
                    <ul className="list-disc list-inside text-sm text-muted space-y-1 mt-1">
                      {result.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
