"use client";

import { useEffect, useMemo, useState } from "react";
import {
  matchQuestions,
  paperLabel,
  topicalPackName,
  type TopicalSpecPoint,
  type TopicalUnitIndex,
} from "@/lib/topical";
import { docFileName, previewHref } from "@/lib/docs";

export interface TopicalUnitOption {
  code: string;
  name: string;
  subject: string;
  subjectLabel: string;
  papers: number;
  questions: number;
  topics: Array<{ id: string; name: string; questions: number; papers: number }>;
}

const SESSION_LABEL: Record<string, string> = {
  January: "January",
  June: "June",
  October: "October",
};

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

export function TopicalMaker({ units }: { units: TopicalUnitOption[] }) {
  const subjects = useMemo(() => {
    const seen: Array<{ key: string; label: string }> = [];
    for (const unit of units) {
      if (!seen.some((s) => s.key === unit.subject)) {
        seen.push({ key: unit.subject, label: unit.subjectLabel });
      }
    }
    return seen;
  }, [units]);

  const [subject, setSubject] = useState(subjects[0]?.key ?? "mathematics");
  const subjectUnits = units.filter((u) => u.subject === subject);
  const [unitCode, setUnitCode] = useState(subjectUnits[0]?.code ?? units[0]?.code ?? "");
  const unit = units.find((u) => u.code === unitCode) ?? subjectUnits[0] ?? units[0];

  const [index, setIndex] = useState<TopicalUnitIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  // Single specification lines, on top of whole sections; ids read "<topic>/<n>".
  const [points, setPoints] = useState<string[]>([]);
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [fromYear, setFromYear] = useState(0);
  const [toYear, setToYear] = useState(0);
  const [sessions, setSessions] = useState<string[]>([]);
  const [includeMarkSchemes, setIncludeMarkSchemes] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);

  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<{ name: string; mb: number } | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Switching subject lands on that subject's first unit.
  function pickSubject(key: string) {
    setSubject(key);
    const first = units.find((u) => u.subject === key);
    if (first) setUnitCode(first.code);
  }

  useEffect(() => {
    if (!unit) return;
    let cancelled = false;
    setIndex(null);
    setLoadError(null);
    setTopics([]);
    setPoints([]);
    setOpenTopics([]);
    setBuilt(null);
    setBuildError(null);

    // No-store: the index is rebuilt with the papers, and a cached copy would
    // hide newly added specification points from this page.
    fetch(`/topical-data/${unit.code}.json`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TopicalUnitIndex>;
      })
      .then((data) => {
        if (cancelled) return;
        setIndex(data);
        const years = data.papers.map((p) => p.year);
        const min = Math.min(...years);
        const max = Math.max(...years);
        setFromYear(min);
        setToYear(max);
        setSessions([...new Set(data.papers.map((p) => p.session))]);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load this unit");
      });

    return () => {
      cancelled = true;
    };
  }, [unit?.code]);

  const years = useMemo(() => {
    if (!index) return [] as number[];
    return [...new Set(index.papers.map((p) => p.year))].sort((a, b) => b - a);
  }, [index]);

  const availableSessions = useMemo(() => {
    if (!index) return [] as string[];
    const order = ["January", "June", "October"];
    return [...new Set(index.papers.map((p) => p.session))].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
  }, [index]);

  const match = useMemo(
    () =>
      index
        ? matchQuestions(index, { topics, points, fromYear, toYear, sessions, includeMarkSchemes })
        : { papers: [], questionCount: 0, marks: 0, pageCount: 0, sharedPagePapers: 0 },
    [index, topics, points, fromYear, toYear, sessions, includeMarkSchemes],
  );

  const selectedTopicNames = (unit?.topics ?? [])
    .filter((t) => topics.includes(t.id))
    .map((t) => t.name);
  const selectedPointNames = (index?.points ?? [])
    .filter((p) => points.includes(p.id))
    .map((p) => p.name);

  const pointsByTopic = useMemo(() => {
    const map = new Map<string, TopicalSpecPoint[]>();
    for (const point of index?.points ?? []) {
      const list = map.get(point.topic) ?? [];
      list.push(point);
      map.set(point.topic, list);
    }
    return map;
  }, [index]);
  const pointCount = index?.points?.length ?? 0;

  const filteredTopics = (unit?.topics ?? []).filter((t) =>
    topicQuery.trim() === ""
      ? true
      : `${t.name} ${t.id} ${(pointsByTopic.get(t.id) ?? [])
          .map((point) => point.name)
          .join(" ")}`
          .toLowerCase()
          .includes(topicQuery.trim().toLowerCase()),
  );

  function toggleTopic(topicId: string) {
    const wasOn = topics.includes(topicId);
    setTopics((current) =>
      current.includes(topicId) ? current.filter((t) => t !== topicId) : [...current, topicId],
    );
    // A whole section covers its points, so picking one drops its point picks.
    setPoints((current) => current.filter((p) => !p.startsWith(`${topicId}/`)));
    if (wasOn) return;
    // Turning a section on also opens it, so its lines can be seen and narrowed.
    setOpenTopics((current) => (current.includes(topicId) ? current : [...current, topicId]));
  }

  function togglePoint(topicId: string, pointId: string) {
    setPoints((current) =>
      current.includes(pointId) ? current.filter((p) => p !== pointId) : [...current, pointId],
    );
    // A single point is narrower than its section: the two never both apply.
    setTopics((current) => current.filter((t) => t !== topicId));
  }

  const pickCount = topics.length + points.length;
  const ready = Boolean(index && pickCount > 0 && match.questionCount > 0 && !building);
  const estimatedMb = Math.max(
    1,
    Math.round((match.pageCount * 0.25 + (includeMarkSchemes ? match.papers.length * 0.6 : 0)) * 10) / 10,
  );

  async function handleBuild() {
    if (!index) return;
    setBuilding(true);
    setBuildError(null);
    setBuilt(null);
    try {
      const params = new URLSearchParams({
        unit: index.unit,
        topics: topics.join(","),
        from: String(fromYear),
        to: String(toYear),
        sessions: sessions.join(","),
        ms: includeMarkSchemes ? "1" : "0",
      });
      if (points.length > 0) params.set("points", points.join(","));
      const res = await fetch(`/api/topical?${params.toString()}`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const name = topicalPackName(index, [...selectedTopicNames, ...selectedPointNames]);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setBuilt({ name, mb: Math.round((blob.size / 1_048_576) * 10) / 10 });
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "The pack could not be built");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-label="Choose a unit" className="space-y-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Subject">
          {subjects.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={subject === s.key}
              onClick={() => pickSubject(s.key)}
              className={`border px-3 py-1.5 text-sm transition-colors ${
                subject === s.key
                  ? "border-marker bg-marker text-paper"
                  : "border-white/15 text-chalk hover:border-white/35"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {subjectUnits.map((u) => (
            <button
              key={u.code}
              type="button"
              onClick={() => setUnitCode(u.code)}
              aria-pressed={unitCode === u.code}
              className={`bg-background-soft px-4 py-3 text-left transition-colors ${
                unitCode === u.code ? "text-chalk" : "text-muted hover:text-chalk"
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{u.name}</span>
                <span className="font-mono text-[11px] text-muted">{u.code}</span>
              </span>
              <span className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
                {unitCode === u.code && <span className="h-0.5 w-4 bg-marker" aria-hidden />}
                {u.papers} papers · {u.questions} questions
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start">
        <div className="space-y-6">
          <section className="bg-card border border-card-border shadow-card-sm">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-card-border px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Step 1</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">Pick your topics</h2>
                <p className="mt-1 text-xs text-muted">
                  {(unit?.topics ?? []).length} sections · {pointCount} specification points ·{" "}
                  {pickCount} selected
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className="underline underline-offset-4 decoration-card-border-strong hover:decoration-marker"
                  onClick={() => {
                    setTopics((unit?.topics ?? []).filter((t) => t.questions > 0).map((t) => t.id));
                    setPoints([]);
                  }}
                >
                  Select all
                </button>
                <span className="text-card-border-strong">/</span>
                <button
                  type="button"
                  className="underline underline-offset-4 decoration-card-border-strong hover:decoration-marker"
                  onClick={() => {
                    setTopics([]);
                    setPoints([]);
                  }}
                >
                  Clear
                </button>
              </div>
            </header>

            <div className="px-5 py-4">
              <p className="mb-3 text-xs text-muted">
                Tick a section to take all of it, or open the <span aria-hidden>▶</span> arrow on a row to
                take one specification line at a time.
              </p>

              <label className="sr-only" htmlFor="topic-filter">
                Filter topics
              </label>
              <input
                id="topic-filter"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="Filter topics — differentiation, buffers, immunity…"
                className="mb-4 w-full border border-card-border bg-white/60 px-3 py-2 text-sm outline-none focus:border-marker"
              />

              {loadError && (
                <p className="py-6 text-sm">
                  This unit&apos;s index could not be loaded ({loadError}). Try another unit.
                </p>
              )}

              {!index && !loadError && (
                <div className="grid gap-px bg-card-border sm:grid-cols-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-white/50" />
                  ))}
                </div>
              )}

              {index && (
                <ul className="grid gap-px bg-card-border sm:grid-cols-2">
                  {filteredTopics.map((topic) => {
                    const checked = topics.includes(topic.id);
                    const sectionPoints = pointsByTopic.get(topic.id) ?? [];
                    const open = openTopics.includes(topic.id);
                    const picked = sectionPoints.filter((point) => points.includes(point.id)).length;
                    return (
                      <li key={topic.id} className="bg-card">
                        <div className={`flex items-stretch ${checked ? "bg-marker/5" : ""}`}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleTopic(topic.id)}
                            className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/60"
                          >
                            <span className="flex items-start gap-2.5">
                              <span
                                aria-hidden
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                                  checked ? "border-marker bg-marker text-paper" : "border-card-border-strong bg-white/70"
                                }`}
                              >
                                {checked && (
                                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m2 6.5 2.5 2.5L10 3" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-sm leading-snug">{topic.name}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-muted">[{topic.questions}]</span>
                          </button>
                          {sectionPoints.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenTopics((current) =>
                                  current.includes(topic.id)
                                    ? current.filter((t) => t !== topic.id)
                                    : [...current, topic.id],
                                )
                              }
                              aria-expanded={open}
                              aria-label={`${open ? "Hide" : "Show"} the ${sectionPoints.length} specification points in ${topic.name}`}
                              className="flex w-9 shrink-0 flex-col items-center justify-center gap-1 border-l border-card-border text-[9px] text-muted hover:text-marker"
                            >
                              <span aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`}>
                                ▶
                              </span>
                              <span className={`font-mono text-[10px] ${picked > 0 ? "text-marker" : ""}`}>
                                {picked > 0 ? picked : sectionPoints.length}
                              </span>
                            </button>
                          )}
                        </div>
                        {open && sectionPoints.length > 0 && (
                          <ul className="border-t border-card-border bg-white/35">
                            {sectionPoints.map((point, pointIndex) => {
                              const on = points.includes(point.id);
                              return (
                                <li key={point.id}>
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    onClick={() => togglePoint(topic.id, point.id)}
                                    className={`flex w-full items-start justify-between gap-2 py-1.5 pl-3 pr-2 text-left text-[12px] leading-snug transition-colors ${
                                      on ? "bg-marker/10" : "hover:bg-white/70"
                                    }`}
                                  >
                                    <span className="flex items-start gap-2">
                                      <span
                                        aria-hidden
                                        className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                                          on
                                            ? "border-marker bg-marker text-paper"
                                            : "border-card-border-strong bg-white/70"
                                        }`}
                                      >
                                        {on && (
                                          <svg
                                            viewBox="0 0 12 12"
                                            className="h-2 w-2"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <path d="m2 6.5 2.5 2.5L10 3" />
                                          </svg>
                                        )}
                                      </span>
                                      <span>
                                        <span className="mr-1.5 font-mono text-[10px] text-muted">
                                          {pointIndex + 1}
                                        </span>
                                        {point.name}
                                      </span>
                                    </span>
                                    <span className="shrink-0 font-mono text-[10px] text-muted">
                                      {point.questions} Q
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {index && filteredTopics.length === 0 && (
                <p className="py-6 text-sm text-muted">No topic matches “{topicQuery}”.</p>
              )}
            </div>
          </section>

          <section className="bg-card border border-card-border shadow-card-sm">
            <header className="border-b border-card-border px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Step 2</p>
              <h2 className="font-display text-xl font-semibold tracking-tight">Choose the papers</h2>
            </header>
            <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Years</p>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="from-year">
                    From year
                  </label>
                  <select
                    id="from-year"
                    value={fromYear || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setFromYear(value);
                      if (value > toYear) setToYear(value);
                    }}
                    className="w-full border border-card-border bg-white/70 px-2 py-1.5 text-sm"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted">to</span>
                  <label className="sr-only" htmlFor="to-year">
                    To year
                  </label>
                  <select
                    id="to-year"
                    value={toYear || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setToYear(value);
                      if (value < fromYear) setFromYear(value);
                    }}
                    className="w-full border border-card-border bg-white/70 px-2 py-1.5 text-sm"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Sessions</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableSessions.map((s) => {
                    const on = sessions.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSessions((current) =>
                            current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
                          )
                        }
                        className={`border px-2.5 py-1 text-xs ${
                          on ? "border-marker bg-marker/10 text-ink" : "border-card-border text-muted"
                        }`}
                      >
                        {SESSION_LABEL[s] ?? s}
                      </button>
                    );
                  })}
                  {sessions.length === 0 && <p className="text-xs text-muted">Select at least one session.</p>}
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 border-t border-card-border px-5 py-4">
              <input
                type="checkbox"
                checked={includeMarkSchemes}
                onChange={(e) => setIncludeMarkSchemes(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--marker)]"
              />
              <span>
                <span className="text-sm font-medium">Add the mark schemes</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Appends the complete mark scheme for every paper in the pack — bigger file, everything
                  checkable.
                </span>
              </span>
            </label>
          </section>

          {match.questionCount > 0 && (
            <section className="bg-card border border-card-border shadow-card-sm">
              <button
                type="button"
                onClick={() => setShowQuestions((v) => !v)}
                aria-expanded={showQuestions}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span>
                  <span className="text-sm font-medium">What&apos;s inside</span>
                  <span className="ml-2 text-xs text-muted">
                    {match.questionCount} questions from {match.papers.length} papers
                  </span>
                </span>
                <span className="text-xs text-muted">{showQuestions ? "Hide" : "Show"}</span>
              </button>
              {showQuestions && (
                <ul className="divide-y divide-card-border border-t border-card-border">
                  {match.papers.map((entry) => (
                    <li key={entry.paper.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{paperLabel(entry.paper)}</p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                          {entry.questions.length} question{entry.questions.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {entry.questions.map((q) => (
                          <a
                            key={q.q}
                            href={previewHref(entry.paper.qp, {
                              page: q.from,
                              name: docFileName({
                                subjectLabel: unit?.subjectLabel ?? "",
                                unitCode: entry.paper.id.split("|")[0],
                                unitName: unit?.name,
                                session: entry.paper.session,
                                year: entry.paper.year,
                                variant: entry.paper.variant,
                                kind: "qp",
                              }),
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-card-border px-1.5 py-0.5 font-mono text-[11px] hover:border-marker hover:text-marker"
                            title={`Open page ${q.from}`}
                          >
                            Q{q.q}
                            {q.marks > 0 && <span className="ml-1 text-muted">{q.marks}m</span>}
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="bg-card border border-card-border shadow-card-md lg:sticky lg:top-8">
          <div className="border-b-2 border-marker px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Your topical</p>
            <h2 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight">
              {unit?.name ?? "Choose a unit"}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted">{unit?.code}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <Stat value={match.questionCount} label="questions" />
            <Stat value={match.marks} label="marks" />
            <Stat value={match.papers.length} label="papers" />
            <Stat value={match.pageCount} label="pages" />
          </div>

          <div className="border-t border-card-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
              Selected sections and points
            </p>
            {selectedTopicNames.length + selectedPointNames.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted">None yet — pick at least one.</p>
            ) : (
              <p className="mt-1.5 text-sm leading-snug">
                {[...selectedTopicNames, ...selectedPointNames].join(" · ")}
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              {fromYear || "—"}–{toYear || "—"} · {sessions.length ? sessions.join(", ") : "no sessions"} ·{" "}
              {includeMarkSchemes ? "with mark schemes" : "questions only"}
            </p>
          </div>

          <div className="space-y-3 border-t border-card-border px-5 py-4">
            <button
              type="button"
              onClick={handleBuild}
              disabled={!ready}
              className="btn-primary h-11 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              {building ? "Building…" : "Build the PDF"}
            </button>
            {!building && (
              <p className="text-center text-[11px] text-muted">
                {match.questionCount > 0
                  ? `About ${estimatedMb} MB · PDF built for you`
                  : "Pick topics to see the pack size"}
              </p>
            )}

            {building && (
              <div>
                <div className="h-1 w-full overflow-hidden bg-card-border">
                  <div className="h-1 w-1/3 animate-pulse bg-marker" />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  Fetching the papers and stitching the pack — usually a few seconds per paper.
                </p>
              </div>
            )}

            {built && (
              <div className="border border-card-border bg-white/60 px-3 py-2.5">
                <p className="text-xs font-medium">Saved your pack ({built.mb} MB)</p>
                <p className="mt-0.5 break-words text-[11px] text-muted">{built.name}</p>
              </div>
            )}
            {buildError && (
              <p className="border border-marker/40 bg-marker/5 px-3 py-2 text-[11px] text-marker">
                {buildError}
              </p>
            )}
          </div>

          <p className="border-t border-card-border px-5 py-3 text-[11px] leading-relaxed text-muted">
            Every page is stamped with its paper and question. Topic tags come from the wording of each
            question — check the mark scheme before you trust a tag.
          </p>
        </aside>
      </div>
    </div>
  );
}
