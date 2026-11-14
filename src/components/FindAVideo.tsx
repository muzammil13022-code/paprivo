"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { searchVideos, videoSearchExamples, type VideoHit } from "@/lib/video-search";
import { thumbnailUrl, watchUrl } from "@/lib/videos";
import type { SubjectKey } from "@/lib/subjects";

interface Props {
  /** Scope the search to one subject (used on that subject's video page). */
  subject?: SubjectKey;
  className?: string;
}

type Phase = "idle" | "loading" | "done";

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

function HitCard({ hit }: { hit: VideoHit }) {
  const topicHref = `/${hit.subjectKey}/videos/${hit.unitCode.toLowerCase()}`;
  return (
    <li className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-card-border bg-card p-4 shadow-card-sm">
      <div
        className="h-24 w-full sm:h-20 sm:w-32 shrink-0 rounded-xl bg-cover bg-center bg-neutral-800"
        style={{ backgroundImage: `url(${thumbnailUrl(hit.video)})` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-card-border font-medium">
            {hit.unitCode}
          </span>
          <span>{hit.subjectLabel}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{hit.sectionName}</span>
        </p>
        <p className="mt-1 font-medium leading-snug">{hit.video.t}</p>
        <p className="text-xs text-muted mt-0.5">{hit.video.c}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a
            className="btn-primary h-9 px-3 text-xs inline-flex items-center"
            href={watchUrl(hit.video)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch on YouTube <span aria-hidden className="ml-1">↗</span>
          </a>
          <Link className="doc-btn h-9 inline-flex items-center text-xs" href={topicHref}>
            Open {hit.unitCode} topic list
          </Link>
        </div>
      </div>
    </li>
  );
}

/**
 * Free-text search over the whole verified video library: unit codes, topic
 * names, video titles and channels all match, mirroring Find Your Question.
 */
export function FindAVideo({ subject, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [hits, setHits] = useState<VideoHit[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("loading");
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setHits(searchVideos(trimmed, { subject, limit: 8 }));
        setLastQuery(trimmed);
        setPhase("done");
      }, 300);
    },
    [subject],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const examples = videoSearchExamples(subject);

  return (
    <section
      aria-labelledby="fav-heading"
      className={`rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 ${className}`}
    >
      <h2 id="fav-heading" className="text-xl sm:text-2xl font-bold tracking-tight">
        Find a video
      </h2>
      <p className="text-sm text-muted mt-1 max-w-2xl">
        Type a topic, a unit code or a title — the library is matched against specification topics,
        so &ldquo;enthalpy&rdquo;, &ldquo;WCH12&rdquo; and &ldquo;Hess&rsquo;s law&rdquo; all work.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5" role="search">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the video library..."
            aria-label="Search the video library"
            className="w-full h-11 rounded-xl border border-card-border bg-card text-on-card pl-10 pr-4 text-sm placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/70 transition-shadow"
          />
        </div>
        <button
          type="submit"
          disabled={phase === "loading"}
          className="btn-primary h-11 px-5 text-sm disabled:opacity-70 disabled:cursor-wait"
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
            "Search videos"
          )}
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span>Try:</span>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              runSearch(example);
            }}
            className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:border-accent2-bright/60 hover:text-foreground transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      {phase === "done" && (
        <div className="mt-4" aria-live="polite">
          {hits.length > 0 ? (
            <>
              <p className="text-xs text-muted mb-2">
                {hits.length} video{hits.length === 1 ? "" : "s"} for &ldquo;{lastQuery}&rdquo;
              </p>
              <ul className="space-y-3">
                {hits.map((hit) => (
                  <HitCard key={`${hit.unitCode}-${hit.video.i}`} hit={hit} />
                ))}
              </ul>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted">
              No video in the library matches &ldquo;{lastQuery}&rdquo;. Try fewer words, a unit
              code such as WCH12, or browse the topics below.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
