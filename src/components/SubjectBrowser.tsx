"use client";

import { useMemo, useState } from "react";
import { paperId } from "@/lib/papers";
import type { Paper, Subject } from "@/types";
import { useUserState } from "@/lib/state";

const SESSIONS = ["January", "June", "October"] as const;

function PaperRow({ paper }: { paper: Paper }) {
  const { progress, bookmarks, toggleProgress, toggleBookmark } = useUserState();
  const id = paperId(paper.code, paper.session, paper.year, paper.variant);
  const done = progress.has(id);
  const starred = bookmarks.has(id);

  return (
    <li
      className="card-interactive rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2 sm:gap-3 shadow-card-sm"
      style={{
        borderColor: done ? "var(--accent2-bright)" : "var(--card-border)",
        boxShadow: done ? "inset 3px 0 0 var(--accent2-bright)" : undefined,
      }}
    >
      <button
        onClick={() => toggleProgress(id)}
        aria-pressed={done}
        title={done ? "Mark as not done" : "Mark as done"}
        className="w-6 h-6 rounded-md border flex items-center justify-center text-xs shrink-0 transition-colors text-white border-transparent"
        style={done ? { background: "var(--accent2)" } : { borderColor: "var(--card-border)" }}
      >
        {done ? "✓" : ""}
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <p className="font-medium">{paper.session}</p>
        <p className="font-medium">{paper.year}</p>
        {paper.variant && (
          <span
            className="text-xs px-1.5 py-0.5 rounded text-white"
            style={{ background: "var(--accent)" }}
          >
            Variant {paper.variant}
          </span>
        )}
        <span className="text-xs opacity-70">{paper.code}</span>
      </div>

      <button
        onClick={() => toggleBookmark(id)}
        aria-pressed={starred}
        aria-label={starred ? "Remove bookmark" : "Bookmark this paper"}
        title={starred ? "Remove bookmark" : "Bookmark this paper"}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-black/5"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={starred ? "var(--accent2-bright)" : "none"}
          stroke={starred ? "var(--accent2-bright)" : "var(--card-border-strong)"}
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" />
        </svg>
      </button>

      <div className="flex gap-1.5 flex-wrap">
        {paper.qp && (
          <a className="doc-btn" href={paper.qp.url} target="_blank" rel="noopener noreferrer">
            Paper{paper.qp.gated && <span title="Requires a free Pearson sign-in"> (sign-in)</span>}
          </a>
        )}
        {paper.ms && (
          <a className="doc-btn" href={paper.ms.url} target="_blank" rel="noopener noreferrer">
            Mark scheme{paper.ms.gated && <span title="Requires a free Pearson sign-in"> (sign-in)</span>}
          </a>
        )}
        {paper.er && (
          <a className="doc-btn" href={paper.er.url} target="_blank" rel="noopener noreferrer">
            Report{paper.er.gated && <span title="Requires a free Pearson sign-in"> (sign-in)</span>}
          </a>
        )}
      </div>
    </li>
  );
}

export function SubjectBrowser({ subject }: { subject: Subject }) {
  const [sessionFilter, setSessionFilter] = useState<"All" | (typeof SESSIONS)[number]>("All");
  const [unitFilter, setUnitFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  const years = useMemo(
    () => [...new Set(subject.units.flatMap((u) => u.papers.map((p) => p.year)))].sort((a, b) => b - a),
    [subject],
  );
  const [yearFilter, setYearFilter] = useState<number | "All">("All");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: Array<{ unit: string; name: string; paper: Paper }> = [];
    for (const unit of subject.units) {
      for (const paper of unit.papers) {
        if (sessionFilter !== "All" && paper.session !== sessionFilter) continue;
        if (yearFilter !== "All" && paper.year !== yearFilter) continue;
        if (unitFilter !== "All" && unit.code !== unitFilter) continue;
        if (q && !`${paper.session} ${paper.year} ${paper.code} ${unit.name}`.toLowerCase().includes(q)) continue;
        all.push({ unit: unit.code, name: unit.name, paper });
      }
    }
    return all;
  }, [subject, sessionFilter, yearFilter, unitFilter, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="h-9 rounded-lg border border-card-border bg-card px-2 text-sm transition-colors hover:border-card-border-strong focus:outline-none focus:ring-2 focus:ring-ring/60"
          aria-label="Filter by unit"
        >
          <option value="All">All units</option>
          {subject.units.map((u) => (
            <option key={u.code} value={u.code}>
              {u.code} — {u.short}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value === "All" ? "All" : Number(e.target.value))}
          className="h-9 rounded-lg border border-card-border bg-card px-2 text-sm transition-colors hover:border-card-border-strong focus:outline-none focus:ring-2 focus:ring-ring/60"
          aria-label="Filter by year"
        >
          <option value="All">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-card-border overflow-hidden text-sm bg-card">
          {(["All", ...SESSIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSessionFilter(s)}
              className={`px-3 h-9 transition-all duration-200 ${
                sessionFilter === s
                  ? "text-white font-medium"
                  : "text-on-card/70 hover:bg-black/5"
              }`}
              style={sessionFilter === s ? { background: "var(--accent)" } : undefined}
            >
              {s === "All" ? "All sessions" : s}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="h-9 flex-1 min-w-40 rounded-lg border border-card-border bg-card px-3 text-sm transition-colors hover:border-card-border-strong focus:outline-none focus:ring-2 focus:ring-ring/60"
          aria-label="Search papers"
        />
      </div>

      <p className="text-sm text-muted">
        {rows.length} paper{rows.length === 1 ? "" : "s"}
        {rows.length > 0 && " — tick one to mark it done, star it to bookmark"}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card p-8 text-center opacity-70">
          Nothing matches those filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ unit, name, paper }) => (
            <li key={paperId(paper.code, paper.session, paper.year, paper.variant)}>
              <div className="mb-1 text-xs">
                <span className="font-semibold">{unit}</span>{" "}
                <span className="text-muted">{name}</span>
              </div>
              <PaperRow paper={paper} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
