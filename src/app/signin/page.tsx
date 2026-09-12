"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useUserState } from "@/lib/state";

export default function SignInPage() {
  const router = useRouter();
  const { refresh } = useUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setBusy(false);
      setError("Wrong email or password.");
      return;
    }
    await refresh();
    setBusy(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="text-muted mt-1 text-sm">Welcome back — your subjects, progress and bookmarks are waiting.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-card-border bg-card px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-card-border bg-card px-3"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-lg bg-accent text-white font-medium disabled:opacity-60 hover:bg-accent-soft transition-opacity"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="underline underline-offset-2 hover:text-accent2-bright">
          Create an account
        </Link>
      </p>
    </div>
  );
}
