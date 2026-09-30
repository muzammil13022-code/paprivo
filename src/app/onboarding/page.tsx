"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { subjectList, paperCountOf, SUBJECTS } from "@/lib/subjects";
import { useUserState } from "@/lib/state";
import type { SubjectKey } from "@/lib/papers";

export default function OnboardingPage() {
  const router = useRouter();
  const { subjectKeys, setSubjects } = useUserState();
  // null = no local edits yet, mirror the stored selection
  const [draft, setDraft] = useState<SubjectKey[] | null>(null);
  const picked = draft ?? subjectKeys;

  function toggle(key: SubjectKey) {
    setDraft(picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]);
  }

  function save() {
    setSubjects(picked);
    router.push("/");
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your subjects</h1>
      <p className="text-muted mt-1.5 text-sm">
        Choose what you study — the homepage will show just those. Saved in this browser, no account
        needed. You can change this any time.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {subjectList.map((meta) => {
          const on = picked.includes(meta.key as SubjectKey);
          const count = paperCountOf(meta.key as SubjectKey);
          return (
            <button
              key={meta.key}
              onClick={() => toggle(meta.key as SubjectKey)}
              aria-pressed={on}
              className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                on
                  ? "border-accent2 bg-card shadow-card-md"
                  : "border-card-border bg-card shadow-card-sm hover:border-accent2 hover:shadow-card-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{meta.label}</span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-colors ${
                    on ? "bg-accent border-accent text-white" : "border-card-border-strong"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">{meta.unitsLine}</p>
              <p className="text-xs text-muted mt-1">
                {count > 0 ? `${count} papers · ${SUBJECTS[meta.key as SubjectKey].blurb}` : meta.blurb}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} className="btn-primary h-10 px-5 text-sm">
          Save {picked.length > 0 ? `(${picked.length})` : ""}
        </button>
        <p className="text-sm text-muted">
          {picked.length === 0
            ? "Nothing selected — we'll show every subject instead."
            : `Personalising for ${picked.length} subject${picked.length === 1 ? "" : "s"}.`}
        </p>
      </div>
    </div>
  );
}
