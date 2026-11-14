"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { HitCard } from "@/components/FindYourQuestion";
import { VideoHitCard } from "@/components/FindAVideo";
import {
  findQuestion,
  parseQuestionQuery,
  type QuestionSearchResult,
} from "@/lib/question-search";
import { searchVideos, type VideoHit } from "@/lib/video-search";
import { Reveal } from "@/components/Reveal";

const EXAMPLES = ["WMA11 June 2024 Q3", "WCH12 2023 Q5", "enthalpy", "projectile motion"];

type Phase = "idle" | "loading" | "done";

interface Outcome {
  /** True when the query looked like a paper reference rather than a topic. */
  paperMode: boolean;
  question: QuestionSearchResult | null;
  videos: VideoHit[];
  unitCode: string | null;
  query: string;
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * One box for both lookups on the homepage.
 *
 * A reference with a session/year (or unit code + question number) is treated
 * as a paper lookup; anything else is matched against the video library. A
 * paper query also lists that unit's videos, so neither result type gets lost.
 */
export function UnifiedSearch() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("loading");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const intent = parseQuestionQuery(trimmed);
      const paperMode =
        intent.year !== null ||
        (intent.code !== null && intent.session !== null) ||
        (intent.code !== null && intent.questionNumber !== null);

      const question = paperMode ? findQuestion(trimmed) : null;
      const videoQuery = paperMode && intent.code ? intent.code : trimmed;

      setOutcome({
        paperMode,
        question,
        videos: searchVideos(videoQuery, { limit: paperMode ? 4 : 8 }),
        unitCode: intent.code,
        query: trimmed,
      });
      setResultKey((k) => k + 1);
      setPhase("done");
    }, 350);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const questionHits =
    outcome?.question && outcome.question.status !== "none" ? outcome.question.hits : [];
  const questionNumber = outcome?.question?.intent.questionNumber ?? null;
  const videoHits = outcome?.videos ?? [];
  const nothing = phase === "done" && questionHits.length === 0 && videoHits.length === 0;

  return (
    <section aria-labelledby="search-all-heading" className="relative overflow-hidden">
      <div aria-hidden className="absolute -inset-x-6 -top-10 bottom-0 pointer-events-none">
        <div className="anim-glow absolute left-1/2 top-0 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-accent/25 blur-[110px]" />
      </div>

      <Reveal className="relative">
        <div className="rounded-3xl border border-white/10 bg-background-soft/80 backdrop-blur p-6 sm:p-8 shadow-glow">
          <h2 id="search-all-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find a question or a video
          </h2>
          <p className="text-muted mt-1.5 max-w-2xl">
            One box for both: give a paper reference (unit code, session, question number) to open
            the paper, or type a topic to get the videos that cover it.
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
                placeholder="e.g. WMA11 June 2024 Q3 or enthalpy"
                aria-label="Search papers and videos"
                className="w-full h-12 rounded-xl border border-card-border bg-card text-on-card pl-10 pr-4 text-sm sm:text-base placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/70 transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={phase === "loading"}
              className="btn-primary h-12 px-6 text-sm sm:text-base disabled:opacity-70 disabled:cursor-wait"
            >
              {phase === "loading" ? (
                <>
                  <span
                    className="anim-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Searching…
                </>
              ) : (
                "Search"
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

          <div aria-live="polite" className="mt-6">
            {phase === "done" && outcome && (
              <div key={resultKey} className="anim-rise space-y-4">
                {questionHits.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {outcome.question?.status === "exact"
                        ? "Papers"
                        : "No exact question — close matches from the catalogue"}
                    </p>
                    {questionNumber === null &&
                      questionHits.length > 0 &&
                      outcome.question?.status === "exact" && (
                        <p className="text-xs text-muted">
                          Add a question number (e.g. &ldquo;Q3&rdquo;) to open the right page.
                        </p>
                      )}
                    {questionHits.map((hit, i) => (
                      <Reveal
                        key={`${hit.unitCode}-${hit.paper.session}-${hit.paper.year}-${hit.paper.variant ?? ""}-${i}`}
                        delay={i * 60}
                      >
                        <HitCard
                          hit={hit}
                          questionNumber={questionNumber}
                          compact={outcome.question?.status !== "exact"}
                        />
                      </Reveal>
                    ))}
                  </div>
                )}

                {videoHits.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {outcome.paperMode && outcome.unitCode
                        ? `Videos for ${outcome.unitCode}`
                        : "Videos"}
                    </p>
                    <ul className="space-y-3">
                      {videoHits.map((hit) => (
                        <VideoHitCard key={`${hit.unitCode}-${hit.video.i}`} hit={hit} />
                      ))}
                    </ul>
                  </div>
                )}

                {nothing && (
                  <div className="rounded-2xl border border-card-border bg-card p-5 text-on-card">
                    <h3 className="font-semibold">Nothing matched &ldquo;{outcome.query}&rdquo;</h3>
                    <p className="text-sm text-muted mt-1.5">
                      Paprivo indexes Pearson Edexcel IAL units (WMA11, WCH12, WPH11) and the video
                      library&apos;s specification topics. Try a unit code plus session and year for
                      a paper, or a topic word such as &ldquo;titration&rdquo; for videos.
                    </p>
                  </div>
                )}

                {!outcome.paperMode && videoHits.length > 0 && (
                  <p className="text-xs text-muted">
                    Looking for a paper? Add the session and year, e.g. &ldquo;WMA11 June 2024
                    Q3&rdquo;.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
