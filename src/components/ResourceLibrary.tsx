"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  searchResources,
  groupByType,
  subjectLabelOf,
  RESOURCE_LEVELS,
  RESOURCE_TYPES,
  type Resource,
  type ResourceFilters,
  type ResourceLevel,
  type ResourceType,
} from "@/lib/resources";
import { SUBJECT_ORDER } from "@/lib/subjects";
import { Reveal } from "@/components/Reveal";

const LEVEL_LABEL: Record<ResourceLevel, string> = { as: "AS", a2: "A2", alevel: "Full A Level" };

const TYPE_BLURB: Record<ResourceType, string> = {
  "past-paper": "Full past papers with mark schemes and examiner reports",
  "topical-paper": "Questions grouped by syllabus topic",
  textbook: "Published student books, linked from the official source",
  "mark-scheme": "Official mark schemes",
  "revision-resource": "Specifications, data sheets and other revision material",
};

function ResourceCard({ resource }: { resource: Resource }) {
  const hosted = resource.accessType === "hosted" && resource.fileUrl;
  const href = resource.externalUrl ?? resource.fileUrl ?? null;
  const leavesSite = Boolean(href && resource.accessType === "external" && !href.startsWith("/"));
  const isTextbook = resource.resourceType === "textbook";

  return (
    <div className="card-interactive rounded-2xl border border-card-border bg-card p-5 flex flex-col gap-2 shadow-card-sm h-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{resource.title}</h3>
        {resource.level && (
          <span
            className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-md text-white"
            style={{ background: "var(--accent)" }}
          >
            {LEVEL_LABEL[resource.level]}
          </span>
        )}
      </div>

      {resource.description && <p className="text-sm text-muted flex-1">{resource.description}</p>}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span className="font-medium text-on-card/80">{subjectLabelOf(resource.subject)}</span>
        {resource.subjectCode && <span>· {resource.subjectCode}</span>}
        {resource.examBoard && <span>· {resource.examBoard}</span>}
        {resource.topic && (
          <span
            className="font-medium px-2 py-0.5 rounded-md"
            style={{ background: "var(--accent2-bright)", color: "#fff" }}
          >
            {resource.topic}
          </span>
        )}
        {hosted && resource.license && (
          <span className="font-medium px-2 py-0.5 rounded-md bg-accent2/10 text-accent2 border border-accent2/30">
            Hosted · {resource.license}
          </span>
        )}
        {!hosted && isTextbook && (
          <span className="font-medium px-2 py-0.5 rounded-md bg-card-border/40 text-on-card/70">
            External
          </span>
        )}
      </div>

      <div className="mt-1">
        {hosted ? (
          <>
            <Link className="btn-primary h-9 px-4 text-sm" href={`/textbooks/${resource.id}`}>
              Open Textbook
            </Link>
            {resource.license && (
              <p className="text-xs text-muted mt-1.5">License: {resource.license}</p>
            )}
          </>
        ) : href && leavesSite ? (
          <>
            <a className="btn-primary h-9 px-4 text-sm" href={href} target="_blank" rel="noopener noreferrer">
              {isTextbook ? "Open Textbook" : "Open External Resource"} <span aria-hidden>↗</span>
            </a>
            <p className="text-xs text-muted mt-1.5">
              Opens the external site in a new tab — you are leaving Paprivo. Source: {resource.source}.
            </p>
          </>
        ) : href ? (
          <a
            className="btn-secondary !text-on-card !border-card-border !bg-card hover:!border-accent h-9 px-4 text-sm"
            href={href}
          >
            View Resource
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function ResourceLibrary({ initialSubject }: { initialSubject?: string }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [level, setLevel] = useState<ResourceLevel | "">("");
  const [type, setType] = useState<ResourceType | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo<ResourceFilters>(() => {
    const f: ResourceFilters = {};
    if (subject) f.subject = subject;
    if (level) f.level = level;
    if (type) f.type = type;
    return f;
  }, [subject, level, type]);

  const results = useMemo(() => searchResources(query, filters), [query, filters]);
  const grouped = useMemo(() => groupByType(results), [results]);
  const filtersActive = Boolean(subject || level || type);

  return (
    <div className="space-y-6">
      {/* Search + filter toggle */}
      <div className="rounded-3xl border border-white/10 bg-background-soft/80 backdrop-blur p-5 sm:p-6 shadow-glow">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources — try “Biology AS textbook”…"
            aria-label="Search resources"
            className="w-full h-12 rounded-xl border border-card-border bg-card text-on-card px-4 text-sm sm:text-base placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/70 transition-shadow"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="btn-secondary h-12 px-5 text-sm shrink-0"
          >
            Filters{filtersActive ? " ·" : ""} {showFilters ? "Hide" : "Show"}
          </button>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="mt-4 space-y-3 anim-rise">
            <FilterRow label="Subject">
              <Chip active={!subject} onClick={() => setSubject("")} label="All" />
              {SUBJECT_ORDER.map((s) => (
                <Chip key={s} active={subject === s} onClick={() => setSubject(s)} label={subjectLabelOf(s)} />
              ))}
            </FilterRow>
            <FilterRow label="Level">
              {RESOURCE_LEVELS.map((l) => (
                <Chip
                  key={l.value}
                  active={level === l.value}
                  onClick={() => setLevel(level === l.value ? "" : l.value)}
                  label={l.label}
                />
              ))}
            </FilterRow>
            <FilterRow label="Type">
              {RESOURCE_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  active={type === t.value}
                  onClick={() => setType(type === t.value ? "" : t.value)}
                  label={t.label}
                />
              ))}
            </FilterRow>
          </div>
        )}

        <p className="text-sm text-muted mt-3" aria-live="polite">
          {results.length} resource{results.length === 1 ? "" : "s"} found
        </p>
      </div>

      {/* Grouped results */}
      {results.length === 0 ? (
        <EmptyState query={query} filtersActive={filtersActive} />
      ) : (
        RESOURCE_TYPES.map(({ value, label }) => {
          const items = grouped.get(value) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={value} aria-labelledby={`sec-${value}`}>
              <h2 id={`sec-${value}`} className="text-lg font-semibold mb-1">
                {label}
              </h2>
              <p className="text-sm text-muted mb-3">{TYPE_BLURB[value]}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r, i) => (
                  <Reveal key={r.id} delay={(i % 3) * 90}>
                    <ResourceCard resource={r} />
                  </Reveal>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? "bg-accent text-white font-medium shadow-card-sm"
          : "border border-white/15 bg-white/5 text-foreground/80 hover:border-accent2-bright/60 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ query, filtersActive }: { query: string; filtersActive: boolean }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 sm:p-8 text-on-card text-center">
      <h3 className="font-semibold">More resources coming soon</h3>
      <p className="text-sm text-muted mt-2 max-w-md mx-auto">
        {query || filtersActive
          ? "Nothing matches that search yet. Paprivo only lists resources that are real and verified — try fewer words or clear the filters."
          : "The library is growing. Paprivo only lists resources that are real and verified, so new categories appear as they are added."}
      </p>
    </div>
  );
}
