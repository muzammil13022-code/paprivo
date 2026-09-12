"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUBJECT_KEYS, type SubjectKey } from "@/lib/papers";

/**
 * User state model:
 *  - Guest: subjects/progress/bookmarks live in localStorage.
 *  - Signed in: same shape mirrored server-side; mutations optimistically
 *    update local state then PATCH the API.
 *  - On first sign-in, guest state is promoted via /api/migrate.
 */

const LS_SUBJECTS = "ial.subjects.v1";
const LS_PROGRESS = "ial.progress.v1";
const LS_BOOKMARKS = "ial.bookmarks.v1";
const LS_MIGRATED = "ial.migrated.v1";

export interface UserState {
  loading: boolean;
  signedIn: boolean;
  email: string | null;
  name: string | null;
  subjectKeys: SubjectKey[];
  progress: Set<string>;
  bookmarks: Set<string>;
  /** Re-fetch /api/me — call after sign-in/sign-up so the UI reflects the session. */
  refresh: () => Promise<void>;
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
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [serverProgress, setServerProgress] = useState<Set<string>>(new Set());
  const [serverBookmarks, setServerBookmarks] = useState<Set<string>>(new Set());
  const [guestSubjects, setGuestSubjects] = useState<SubjectKey[]>([]);
  const [guestProgress, setGuestProgress] = useState<Set<string>>(new Set());
  const [guestBookmarks, setGuestBookmarks] = useState<Set<string>>(new Set());

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        signedIn: boolean;
        email?: string;
        name?: string;
        subjectKeys: string[];
        progress: string[];
        bookmarks: string[];
      };
      if (data.signedIn) {
        setSignedIn(true);
        setEmail(data.email ?? null);
        setName(data.name ?? null);
        setServerProgress(new Set(data.progress));
        setServerBookmarks(new Set(data.bookmarks));

        // one-time migration of guest state into the account
        const alreadyMigrated = window.localStorage.getItem(LS_MIGRATED) === "1";
        const gSubjects = readSubjects();
        const gProgress = [...readSet(LS_PROGRESS)];
        const gBookmarks = [...readSet(LS_BOOKMARKS)];
        const hasGuestState = gSubjects.length > 0 || gProgress.length > 0 || gBookmarks.length > 0;
        if (!alreadyMigrated && hasGuestState) {
          await fetch("/api/migrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectKeys: gSubjects,
              progress: gProgress,
              bookmarks: gBookmarks,
            }),
          });
          window.localStorage.setItem(LS_MIGRATED, "1");
          // merge server + migrated guest state for this session
          setServerProgress((prev) => new Set([...prev, ...gProgress]));
          setServerBookmarks((prev) => new Set([...prev, ...gBookmarks]));
        }
        if (data.subjectKeys.length > 0) {
          persist(LS_SUBJECTS, data.subjectKeys);
        }
        setGuestSubjects((data.subjectKeys as SubjectKey[]) ?? []);
      } else {
        setSignedIn(false);
        setEmail(null);
        setName(null);
        setGuestSubjects(readSubjects());
        setGuestProgress(readSet(LS_PROGRESS));
        setGuestBookmarks(readSet(LS_BOOKMARKS));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const signedInState = signedIn;

  const toggleSubject = useCallback(
    (key: SubjectKey, on: boolean) => {
      if (signedInState) {
        setGuestSubjects((prev) => {
          const next = on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key);
          void fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subjectKeys: next }),
          });
          return next;
        });
      } else {
        setGuestSubjects((prev) => {
          const next = on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key);
          persist(LS_SUBJECTS, next);
          return next;
        });
      }
    },
    [signedInState],
  );

  const setSubjects = useCallback(
    (keys: SubjectKey[]) => {
      const unique = [...new Set(keys)];
      setGuestSubjects(unique);
      persist(LS_SUBJECTS, unique);
      if (signedInState) {
        void fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectKeys: unique }),
        });
      }
    },
    [signedInState],
  );

  const toggleProgress = useCallback(
    (id: string) => {
      if (signedInState) {
        let added = false;
        setServerProgress((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
            added = false;
          } else {
            next.add(id);
            added = true;
          }
          void fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, done: added }),
          });
          return next;
        });
      } else {
        setGuestProgress((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          persist(LS_PROGRESS, [...next]);
          return next;
        });
      }
    },
    [signedInState],
  );

  const toggleBookmark = useCallback(
    (id: string) => {
      if (signedInState) {
        let starred = false;
        setServerBookmarks((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
            starred = false;
          } else {
            next.add(id);
            starred = true;
          }
          void fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, starred }),
          });
          return next;
        });
      } else {
        setGuestBookmarks((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          persist(LS_BOOKMARKS, [...next]);
          return next;
        });
      }
    },
    [signedInState],
  );

  const value = useMemo<UserState>(
    () => ({
      loading,
      signedIn,
      email,
      name,
      subjectKeys: guestSubjects,
      progress: signedIn ? serverProgress : guestProgress,
      bookmarks: signedIn ? serverBookmarks : guestBookmarks,
      refresh: loadMe,
      toggleSubject,
      setSubjects,
      toggleProgress,
      toggleBookmark,
    }),
    [loading, signedIn, email, name, guestSubjects, guestProgress, serverProgress, guestBookmarks, serverBookmarks, loadMe, toggleSubject, setSubjects, toggleProgress, toggleBookmark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserState(): UserState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserState must be used within UserStateProvider");
  return ctx;
}
