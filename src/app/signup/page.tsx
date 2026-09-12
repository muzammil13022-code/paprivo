"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useUserState } from "@/lib/state";

export default function SignUpPage() {
  const router = useRouter();
  const { refresh } = useUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create the account.");
        setBusy(false);
        return;
      }
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError("Account created — please sign in.");
        setBusy(false);
        return;
      }
      await refresh();
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="text-muted mt-1 text-sm">
        Pick your subjects, track every paper you complete, and bookmark favourites. Your guest
        activity carries over automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Name (optional)</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-card-border bg-card px-3"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-card-border bg-card px-3"
          />
          <span className="text-xs text-muted">At least 8 characters.</span>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-lg bg-accent text-white font-medium disabled:opacity-60 hover:bg-accent-soft transition-opacity"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Already registered?{" "}
        <Link href="/signin" className="underline underline-offset-2 hover:text-accent2-bright">
          Sign in
        </Link>
      </p>
    </div>
  );
}
