"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TopicalUnitOption } from "@/components/TopicalMaker";
import {
  matchQuestions,
  mockTestName,
  paperLabel,
  paperMarks,
  type TopicalSelection,
  type TopicalSpecPoint,
  type TopicalUnitIndex,
} from "@/lib/topical";
import { docFileName, previewHref } from "@/lib/docs";

const SESSION_LABEL: Record<string, string> = {
  January: "January",
  June: "June",
  October: "October",
};

const MARK_PRESETS = [25, 40, 60, 75];

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

export function MockTestMaker({ units }: { units: TopicalUnitOption[] }) {
  const subjects = useMemo(() => {
    const seen: Array<{ key: string; label: string }> = [];
    for (const option of units) {
      if (!seen.some((s) => s.key === option.subject)) {
        seen.push({ key: option.subject, label: option.subjectLabel });
      }
    }
    return seen;
  }, [units]);

  const [subject, setSubject] = useState(subjects[0]?.key ?? "mathematics");
  const subjectUnits = units.filter((u) => u.subject === subject);
  const [unitCode, setUnitCode] = useState(subjectUnits[0]?.code ?? units[0]?.code ?? "");
  const unit = units.find((u) => u.code === unitCode) ?? subjectUnits[0] ?? units[0];

  const activeCode = unit?.code ?? "";
  // Keyed by unit so switching units shows the loading state without an effect
  // resetting state on the way in.
  const [loaded, setLoaded] = useState<{
    code: string;
    data?: TopicalUnitIndex;
    error?: string;
  } | null>(null);
  const index = loaded?.code === activeCode ? loaded.data ?? null : null;
  const loadError = loaded?.code === activeCode ? loaded.error ?? null : null;

  const [mode, setMode] = useState<"topics" | "papers">("topics");
  const [topics, setTopics] = useState<string[]>([]);
  // Specification points are picked one line at a time, on top of whole sections.
  const [points, setPoints] = useState<string[]>([]);
  // Questions wanted from each picked section/point; absent means all of them.
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [paperIds, setPaperIds] = useState<string[]>([]);
  const [fromYear, setFromYear] = useState(0);
  const [toYear, setToYear] = useState(0);
  const [sessions, setSessions] = useState<string[]>([]);
  const [markTarget, setMarkTarget] = useState(60);
  const [includeMarkSchemes, setIncludeMarkSchemes] = useState(false);
  const [showInside, setShowInside] = useState(false);

  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<{ name: string; mb: number; url: string; marks: number } | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const builtUrl = useRef<string | null>(null);

  // Blob URLs stay alive only while the result panel needs them.
  useEffect(
    () => () => {
      if (builtUrl.current) URL.revokeObjectURL(builtUrl.current);
    },
    [],
  );

  function pickSubject(key: string) {
    setSubject(key);
    const first = units.find((u) => u.subject === key);
    if (first) pickUnit(first.code);
  }

  // Changing unit invalidates every choice made against the old one.
  function pickUnit(code: string) {
    setUnitCode(code);
    setTopics([]);
    setPoints([]);
    setQuotas({});
    setOpenTopics([]);
    setPaperIds([]);
    setShowInside(false);
    setBuildError(null);
    clearBuilt();
  }

  useEffect(() => {
    if (!activeCode) return;
    let cancelled = false;

    // Revalidate: the index is regenerated in place, and a cached copy from
    // before a rebuild would have no specification points in it.
    fetch(`/topical-data/${activeCode}.json`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TopicalUnitIndex>;
      })
      .then((data) => {
        if (cancelled) return;
        setLoaded({ code: activeCode, data });
        const years = data.papers.map((p) => p.year);
        setFromYear(Math.min(...years));
        setToYear(Math.max(...years));
        setSessions([...new Set(data.papers.map((p) => p.session))]);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded({
            code: activeCode,
            error: error instanceof Error ? error.message : "Could not load this unit",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCode]);

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

  const paperOptions = useMemo(() => {
    if (!index) return [] as Array<{ paper: TopicalUnitIndex["papers"][number]; marks: number }>;
    const order = ["January", "June", "October"];
    return [...index.papers]
      .sort(
        (a, b) =>
          b.year - a.year ||
          order.indexOf(a.session) - order.indexOf(b.session) ||
          (b.variant ?? "").localeCompare(a.variant ?? ""),
      )
      .map((paper) => ({ paper, marks: paperMarks(paper) }));
  }, [index]);

  const selection: TopicalSelection = useMemo(
    () => ({
      topics,
      points,
      fromYear,
      toYear,
      sessions,
      includeMarkSchemes,
      mode,
      paperIds,
      markTarget,
      quotas,
      kind: "mock",
    }),
    [
      topics,
      points,
      fromYear,
      toYear,
      sessions,
      includeMarkSchemes,
      mode,
      paperIds,
      markTarget,
      quotas,
    ],
  );

  const match = useMemo(
    () =>
      index
        ? matchQuestions(index, selection)
        : { papers: [], questionCount: 0, marks: 0, pageCount: 0, sharedPagePapers: 0 },
    [index, selection],
  );

  const allTopics = unit?.topics ?? [];
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
  const query = topicQuery.trim().toLowerCase();
  const filteredTopics = allTopics.filter((topic) =>
    query === ""
      ? true
      : `${topic.name} ${topic.id} ${(pointsByTopic.get(topic.id) ?? [])
          .map((point) => point.name)
          .join(" ")}`
          .toLowerCase()
          .includes(query),
  );

  function toggleTopic(topicId: string) {
    setTopics((current) =>
      current.includes(topicId) ? current.filter((t) => t !== topicId) : [...current, topicId],
    );
    // A whole section covers its points, so picking one drops its point picks.
    setPoints((current) => current.filter((p) => !p.startsWith(`${topicId}/`)));
  }

  function togglePoint(topicId: string, pointId: string) {
    setPoints((current) =>
      current.includes(pointId) ? current.filter((p) => p !== pointId) : [...current, pointId],
    );
    // A single point is narrower than its section: the two never both apply.
    setTopics((current) => current.filter((t) => t !== topicId));
  }
  // An empty box means "all"; clearing it drops the cap for that row.
  function setQuota(id: string, raw: string) {
    const count = Number(raw);
    setQuotas((current) => {
      const next = { ...current };
      if (raw.trim() === "" || !Number.isFinite(count) || count <= 0) delete next[id];
      else next[id] = Math.floor(count);
      return next;
    });
  }

  // Section numbering follows the specification order, not the filtered list.
  const topicNumber = (id: string) => String(allTopics.findIndex((t) => t.id === id) + 1).padStart(2, "0");
  const busiestTopic = Math.max(1, ...allTopics.map((t) => t.questions));

  const hasChoice = mode === "topics" ? topics.length + points.length > 0 : paperIds.length > 0;
  const ready = Boolean(index && hasChoice && match.questionCount > 0 && !building);
  const estimatedMb = Math.max(
    1,
    Math.round((match.pageCount * 0.25 + (includeMarkSchemes ? match.papers.length * 0.6 : 0)) * 10) / 10,
  );

  function clearBuilt() {
    if (builtUrl.current) URL.revokeObjectURL(builtUrl.current);
    builtUrl.current = null;
    setBuilt(null);
  }

  async function handleBuild() {
    if (!index || !unit) return;
    setBuilding(true);
    setBuildError(null);
    clearBuilt();
    try {
      const params = new URLSearchParams({
        unit: index.unit,
        kind: "mock",
        mode,
        from: String(fromYear),
        to: String(toYear),
        sessions: sessions.join(","),
        ms: includeMarkSchemes ? "1" : "0",
      });
      if (mode === "papers") params.set("papers", paperIds.join(","));
      else {
        params.set("topics", topics.join(","));
        if (points.length > 0) params.set("points", points.join(","));
        params.set("marks", String(markTarget));
        // Only picks that are actually selected carry a count.
        const qty = Object.entries(quotas).filter(
          ([id]) => topics.includes(id) || points.includes(id),
        );
        if (qty.length > 0) params.set("qty", qty.map(([id, n]) => `${id}:${n}`).join(","));
      }

      const res = await fetch(`/api/topical?${params.toString()}`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      builtUrl.current = url;
      const name = mockTestName(index, `${match.marks} marks`);
      setBuilt({ name, mb: Math.round((blob.size / 1_048_576) * 10) / 10, url, marks: match.marks });
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "The mock could not be built");
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjectUnits.map((option) => {
            const active = unitCode === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => pickUnit(option.code)}
                aria-pressed={active}
                className={`group relative border bg-card px-4 py-3 text-left shadow-card-sm transition-colors ${
                  active
                    ? "border-marker text-chalk"
                    : "border-card-border text-chalk hover:border-card-border-strong"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-[3px] ${active ? "bg-marker" : "bg-transparent"}`}
                />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium leading-snug">{option.name}</span>
                  <span
                    className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] ${
                      active ? "border-marker/50 text-marker" : "border-card-border text-muted"
                    }`}
                  >
                    {option.code}
                  </span>
                </span>
                <span className="mt-2 grid grid-cols-3 gap-2 border-t border-card-border pt-2 text-[10px] uppercase tracking-[0.1em] text-muted">
                  <span>
                    <span className="block font-mono text-xs tracking-normal text-chalk">
                      {option.topics.length}
                    </span>
                    sections
                  </span>
                  <span>
                    <span className="block font-mono text-xs tracking-normal text-chalk">
                      {option.papers}
                    </span>
                    papers
                  </span>
                  <span>
                    <span className="block font-mono text-xs tracking-normal text-chalk">
                      {option.questions}
                    </span>
                    questions
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start">
        <div className="space-y-6">
          <section className="bg-card border border-card-border shadow-card-sm">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-card-border px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Step 1</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">What goes in the mock</h2>
              </div>
              <div className="flex border border-card-border">
                {(
                  [
                    { key: "topics", label: "By topic" },
                    { key: "papers", label: "Whole papers" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={mode === option.key}
                    onClick={() => setMode(option.key)}
                    className={`px-3 py-1.5 text-xs ${
                      mode === option.key ? "bg-marker text-paper" : "text-muted hover:text-chalk"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </header>

            {mode === "topics" ? (
              <div className="px-5 py-4">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-l-2 border-marker bg-white/45 px-3 py-2.5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-marker">
                      Specification {unit?.code}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-semibold leading-snug">
                      {unit?.name ?? "Choose a unit"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">
                      {allTopics.length} section{allTopics.length === 1 ? "" : "s"} · {pointCount} spec points ·{" "}
                      {unit?.papers ?? 0} papers · {topics.length + points.length} selected
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      className="underline underline-offset-4 decoration-card-border-strong hover:decoration-marker"
                      onClick={() => {
                        setTopics(allTopics.map((topic) => topic.id));
                        setPoints([]);
                      }}
                    >
                      All sections
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
                </div>

                <p className="mb-2 text-xs text-muted">
                  Tick a section to take all of it, or open the <span aria-hidden>▶</span> arrow on
                  the right of a section to pick single specification points. A picked row takes everything
                  — type a number in its <span className="font-mono text-[10px] uppercase tracking-[0.1em]">want</span>{" "}
                  box to take only that many questions.
                </p>

                <label className="sr-only" htmlFor="mock-topic-filter">
                  Filter topics
                </label>
                <input
                  id="mock-topic-filter"
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  placeholder="Filter sections — differentiation, electric fields, immunity…"
                  className="mb-4 w-full border border-card-border bg-white/60 px-3 py-2 text-sm outline-none focus:border-marker"
                />

                {!index && !loadError && (
                  <div className="grid gap-px bg-card-border sm:grid-cols-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse bg-white/50" />
                    ))}
                  </div>
                )}

                {loadError && (
                  <p className="py-6 text-sm">
                    This unit&apos;s index could not be loaded ({loadError}). Try another unit.
                  </p>
                )}

                {index && (
                  <ul className="grid gap-px bg-card-border">
                    {filteredTopics.map((topic) => {
                      const checked = topics.includes(topic.id);
                      const share = Math.round((topic.questions / busiestTopic) * 100);
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
                              className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-2 py-2.5 pl-3 pr-2 text-left transition-colors ${
                                checked ? "" : "hover:bg-white/60"
                              }`}
                            >
                              <span className="flex w-full items-start justify-between gap-3">
                                <span className="flex items-start gap-2.5">
                                  <span
                                    aria-hidden
                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                                      checked
                                        ? "border-marker bg-marker text-paper"
                                        : "border-card-border-strong bg-white/70"
                                    }`}
                                  >
                                    {checked && (
                                      <svg
                                        viewBox="0 0 12 12"
                                        className="h-2.5 w-2.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="m2 6.5 2.5 2.5L10 3" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="text-sm leading-snug">
                                    <span className="mr-2 font-mono text-[10px] text-muted">
                                      {topicNumber(topic.id)}
                                    </span>
                                    {topic.name}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-muted">
                                  {topic.questions} Q
                                </span>
                              </span>
                              <span className="ml-[26px] flex items-center gap-2" aria-hidden>
                                <span className="h-[3px] flex-1 bg-card-border">
                                  <span
                                    className={`block h-[3px] ${checked ? "bg-marker" : "bg-marker/45"}`}
                                    style={{ width: `${share}%` }}
                                  />
                                </span>
                                <span className="w-16 shrink-0 text-right text-[10px] uppercase tracking-[0.1em] text-muted">
                                  {topic.papers} papers
                                </span>
                              </span>
                            </button>
                            {checked && (
                              <span className="flex w-[54px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-card-border bg-white/40">
                                <span className="text-[8px] uppercase tracking-[0.1em] text-muted">want</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={topic.questions}
                                  value={quotas[topic.id] ?? ""}
                                  placeholder="all"
                                  aria-label={`How many questions from ${topic.name}`}
                                  onChange={(e) => setQuota(topic.id, e.target.value)}
                                  className="w-9 border border-card-border bg-white/80 px-1 py-0.5 text-center font-mono text-[11px] outline-none focus:border-marker"
                                />
                              </span>
                            )}
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
                                className="flex w-10 shrink-0 flex-col items-center justify-center gap-1 border-l border-card-border text-[9px] text-muted hover:text-marker"
                              >
                                <span
                                  aria-hidden
                                  className={`transition-transform ${open ? "rotate-90" : ""}`}
                                >
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
                              {sectionPoints.map((point, index) => {
                                const on = points.includes(point.id);
                                return (
                                  <li key={point.id} className="flex items-stretch">
                                    <button
                                      type="button"
                                      role="checkbox"
                                      aria-checked={on}
                                      onClick={() => togglePoint(topic.id, point.id)}
                                      className={`flex min-w-0 flex-1 items-start justify-between gap-3 py-1.5 pl-[35px] pr-2 text-left text-[13px] leading-snug transition-colors ${
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
                                            {topicNumber(topic.id)}.{index + 1}
                                          </span>
                                          {point.name}
                                        </span>
                                      </span>
                                      <span className="shrink-0 font-mono text-[10px] text-muted">
                                        {point.questions} Q
                                      </span>
                                    </button>
                                    {on && (
                                      <span className="flex w-[48px] shrink-0 items-center border-l border-card-border bg-white/40 px-1">
                                        <input
                                          type="number"
                                          min={1}
                                          max={point.questions}
                                          value={quotas[point.id] ?? ""}
                                          placeholder="all"
                                          aria-label={`How many questions from ${point.name}`}
                                          onChange={(e) => setQuota(point.id, e.target.value)}
                                          className="w-full border border-card-border bg-white/80 px-1 py-0.5 text-center font-mono text-[10px] outline-none focus:border-marker"
                                        />
                                      </span>
                                    )}
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
            ) : (
              <div className="px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="text-muted">
                    {paperIds.length} of {paperOptions.length} papers selected
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="underline underline-offset-4 decoration-card-border-strong hover:decoration-marker"
                      onClick={() => setPaperIds(paperOptions.slice(0, 1).map((p) => p.paper.id))}
                    >
                      Newest only
                    </button>
                    <span className="text-card-border-strong">/</span>
                    <button
                      type="button"
                      className="underline underline-offset-4 decoration-card-border-strong hover:decoration-marker"
                      onClick={() => setPaperIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {!index && !loadError && <div className="h-40 animate-pulse bg-white/50" />}
                {loadError && (
                  <p className="py-6 text-sm">
                    This unit&apos;s index could not be loaded ({loadError}). Try another unit.
                  </p>
                )}

                {index && (
                  <ul className="max-h-80 divide-y divide-card-border overflow-y-auto border border-card-border">
                    {paperOptions.map(({ paper, marks }) => {
                      const checked = paperIds.includes(paper.id);
                      return (
                        <li key={paper.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() =>
                              setPaperIds((current) =>
                                current.includes(paper.id)
                                  ? current.filter((id) => id !== paper.id)
                                  : [...current, paper.id],
                              )
                            }
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/60"
                          >
                            <span className="flex items-start gap-2.5">
                              <span
                                aria-hidden
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                                  checked
                                    ? "border-marker bg-marker text-paper"
                                    : "border-card-border-strong bg-white/70"
                                }`}
                              >
                                {checked && (
                                  <svg
                                    viewBox="0 0 12 12"
                                    className="h-2.5 w-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="m2 6.5 2.5 2.5L10 3" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-sm leading-snug">{paperLabel(paper)}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-muted">
                              {paper.questions.length} Q · {marks}m
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="bg-card border border-card-border shadow-card-sm">
            <header className="border-b border-card-border px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Step 2</p>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {mode === "topics" ? "How many marks" : "The papers"}
              </h2>
            </header>

            {mode === "topics" ? (
              <div className="space-y-4 px-5 py-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="mark-target"
                      className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted"
                    >
                      Target marks
                    </label>
                    <input
                      id="mark-target"
                      type="number"
                      min={5}
                      max={200}
                      step={5}
                      value={markTarget}
                      onChange={(e) => setMarkTarget(Math.max(5, Math.min(200, Number(e.target.value) || 5)))}
                      className="w-24 border border-card-border bg-white/70 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {MARK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={markTarget === preset}
                        onClick={() => setMarkTarget(preset)}
                        className={`border px-2.5 py-1 text-xs ${
                          markTarget === preset
                            ? "border-marker bg-marker/10 text-ink"
                            : "border-card-border text-muted"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Marks are spread evenly over your picks, newest papers first, so no one section fills the
                  paper. A question that would overshoot is skipped and a smaller one closes the gap —{" "}
                  {match.marks} of {markTarget} marks taken.
                </p>

                <div className="grid gap-5 border-t border-card-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Years</p>
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor="mock-from-year">
                        From year
                      </label>
                      <select
                        id="mock-from-year"
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
                      <label className="sr-only" htmlFor="mock-to-year">
                        To year
                      </label>
                      <select
                        id="mock-to-year"
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
                      {availableSessions.map((session) => {
                        const on = sessions.includes(session);
                        return (
                          <button
                            key={session}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setSessions((current) =>
                                current.includes(session)
                                  ? current.filter((x) => x !== session)
                                  : [...current, session],
                              )
                            }
                            className={`border px-2.5 py-1 text-xs ${
                              on ? "border-marker bg-marker/10 text-ink" : "border-card-border text-muted"
                            }`}
                          >
                            {SESSION_LABEL[session] ?? session}
                          </button>
                        );
                      })}
                      {sessions.length === 0 && (
                        <p className="text-xs text-muted">Select at least one session.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-5 py-4">
                <p className="text-sm">
                  {paperIds.length === 0
                    ? "Pick one or more papers above — each is included whole, every question as printed."
                    : `${paperIds.length} paper${paperIds.length === 1 ? "" : "s"} · ${match.marks} marks · ${match.questionCount} questions`}
                </p>
                <p className="text-xs text-muted">
                  A whole paper is not cut down, so the mark target does not apply. Use the topic mode
                  instead if you want a paper of a specific length.
                </p>
              </div>
            )}

            <label className="flex items-start gap-3 border-t border-card-border px-5 py-4">
              <input
                type="checkbox"
                checked={includeMarkSchemes}
                onChange={(e) => setIncludeMarkSchemes(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--marker)]"
              />
              <span>
                <span className="text-sm font-medium">Append the mark schemes</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Off by default, so the file you open is just the questions. Turn it on when you want
                  the answers in the same PDF.
                </span>
              </span>
            </label>
          </section>

          {match.questionCount > 0 && (
            <section className="bg-card border border-card-border shadow-card-sm">
              <button
                type="button"
                onClick={() => setShowInside((v) => !v)}
                aria-expanded={showInside}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span>
                  <span className="text-sm font-medium">What&apos;s inside</span>
                  <span className="ml-2 text-xs text-muted">
                    {match.questionCount} questions from {match.papers.length} papers
                  </span>
                </span>
                <span className="text-xs text-muted">{showInside ? "Hide" : "Show"}</span>
              </button>
              {showInside && (
                <ul className="divide-y divide-card-border border-t border-card-border">
                  {match.papers.map((entry) => (
                    <li key={entry.paper.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{paperLabel(entry.paper)}</p>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                          {entry.questions.reduce((n, q) => n + q.marks, 0)} marks
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
            <p className="text-[11px] uppercase tracking-[0.18em] text-marker">Your mock</p>
            <h2 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight">
              {unit?.name ?? "Choose a unit"}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted">{unit?.code}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <Stat value={match.marks} label="marks" />
            <Stat value={match.questionCount} label="questions" />
            <Stat value={match.papers.length} label="papers" />
            <Stat value={match.pageCount} label="pages" />
          </div>

          <div className="border-t border-card-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Settings</p>
            <p className="mt-1.5 text-sm leading-snug">
              {mode === "topics"
                ? `${markTarget}-mark paper from ${topics.length} of ${allTopics.length} sections${
                    points.length > 0
                      ? ` + ${points.length} point${points.length === 1 ? "" : "s"}`
                      : ""
                  }`
                : `${paperIds.length} whole paper${paperIds.length === 1 ? "" : "s"}`}
            </p>
            <p className="mt-1 text-xs text-muted">
              {mode === "topics"
                ? `${fromYear || "—"}–${toYear || "—"} · ${sessions.length ? sessions.join(", ") : "no sessions"}`
                : "every question, as printed"}{" "}
              · {includeMarkSchemes ? "with mark schemes" : "questions only"}
            </p>
            {match.questionCount > 0 && (
              <p className="mt-2 text-xs text-muted">Suggested time: {match.marks} min (a mark a minute).</p>
            )}
          </div>

          <div className="space-y-3 border-t border-card-border px-5 py-4">
            <button
              type="button"
              onClick={handleBuild}
              disabled={!ready}
              className="btn-primary h-11 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              {building ? "Building…" : "Build the mock"}
            </button>
            {!building && (
              <p className="text-center text-[11px] text-muted">
                {match.questionCount > 0
                  ? `About ${estimatedMb} MB · opens in a new tab`
                  : "Pick topics or papers to see the size"}
              </p>
            )}

            {building && (
              <div>
                <div className="h-1 w-full overflow-hidden bg-card-border">
                  <div className="h-1 w-1/3 animate-pulse bg-marker" />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  Fetching the papers and stitching the mock — usually a few seconds per paper.
                </p>
              </div>
            )}

            {built && (
              <div className="space-y-2 border border-marker/40 bg-marker/5 px-3 py-3">
                <p className="text-xs font-medium">
                  Ready — {built.marks} marks, {built.mb} MB
                </p>
                <p className="break-words text-[11px] text-muted">{built.name}</p>
                <a
                  href={built.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex h-10 items-center justify-center text-sm"
                >
                  Open in a new tab
                </a>
                <a
                  href={built.url}
                  download={built.name}
                  className="flex h-9 items-center justify-center border border-marker/50 text-xs text-marker transition-colors hover:bg-marker hover:text-paper"
                >
                  Download it instead
                </a>
                <p className="text-[11px] leading-relaxed text-muted">
                  Nothing was saved to your downloads. The PDF opens in the browser viewer — save it from
                  there if you want a copy.
                </p>
              </div>
            )}

            {buildError && (
              <p className="border border-marker/40 bg-marker/5 px-3 py-2 text-[11px] text-marker">{buildError}</p>
            )}
          </div>

          <p className="border-t border-card-border px-5 py-3 text-[11px] leading-relaxed text-muted">
            Questions are reproduced from Pearson Edexcel International A Level past papers for personal
            revision. Every page is stamped with the paper and question it came from.
          </p>
        </aside>
      </div>
    </div>
  );
}
