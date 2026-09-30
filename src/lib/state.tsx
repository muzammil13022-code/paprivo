"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUBJECT_KEYS, type SubjectKey } from "@/lib/papers";

/**
 * User state model — everything lives in localStorage on this device.
 * Progress, bookmarks and subject selections work instantly with no account.
 */

const LS_SUBJECTS = "ial.subjects.v1";
const LS_PROGRESS = "ial.progress.v1";
const LS_BOOKMARKS = "ial.bookmarks.v1";

export interface UserState {
  loading: boolean;
  subjectKeys: SubjectKey[];
  progress: Set<string>;
  bookmarks: Set<string>;
  toggleSubject: (key: SubjectKey, on: boolean) => void;
  setSubjects: (keys: SubjectKey[]) => void;
  toggleProgress: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

const Ctx = createContext<UserState | null>(null);

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function readSubjects(): SubjectKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_SUBJECTS);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is SubjectKey => typeof x === "string" && (SUBJECT_KEYS as readonly string[]).includes(x));
  } catch {
    return [];
  }
}

function persist(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked — state still works in-memory
  }
}

export function UserStateProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [subjectKeys, setSubjectKeys] = useState<SubjectKey[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  // Hydrate from localStorage after mount (keeps SSR markup stable).
  // Deferred to a microtask so the updates don't run synchronously in the effect.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      setSubjectKeys(readSubjects());
      setProgress(readSet(LS_PROGRESS));
      setBookmarks(readSet(LS_BOOKMARKS));
      setLoading(false);
    })();
  }, []);

  const toggleSubject = useCallback((key: SubjectKey, on: boolean) => {
    setSubjectKeys((prev) => {
      const next = on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key);
      persist(LS_SUBJECTS, next);
      return next;
    });
  }, []);

  const setSubjects = useCallback((keys: SubjectKey[]) => {
    const unique = [...new Set(keys)];
    setSubjectKeys(unique);
    persist(LS_SUBJECTS, unique);
  }, []);

  const toggleProgress = useCallback((id: string) => {
    setProgress((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(LS_PROGRESS, [...next]);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(LS_BOOKMARKS, [...next]);
      return next;
    });
  }, []);

  const value = useMemo<UserState>(
    () => ({
      loading,
      subjectKeys,
      progress,
      bookmarks,
      toggleSubject,
      setSubjects,
      toggleProgress,
      toggleBookmark,
    }),
    [loading, subjectKeys, progress, bookmarks, toggleSubject, setSubjects, toggleProgress, toggleBookmark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserState(): UserState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserState must be used within UserStateProvider");
  return ctx;
}
