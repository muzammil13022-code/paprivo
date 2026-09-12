"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useUserState } from "@/lib/state";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, signedIn, email, name, refresh } = useUserState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOutNow() {
    // Auth.js helper: posts with the required CSRF token and clears the session cookie
    await signOut({ redirect: false });
    setMenuOpen(false);
    await refresh();
    router.push("/");
    router.refresh();
  }

  const nav = [
    { href: "/", label: "Home" },
    { href: "/mathematics", label: "Maths" },
    { href: "/physics", label: "Physics" },
    { href: "/chemistry", label: "Chemistry" },
    { href: "/biology", label: "Biology" },
    { href: "/computer-science", label: "CS" },
  ];

  const activePill = "bg-accent text-white font-medium";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Paprivo home">
          <Image
            src="/logo-mark.png"
            alt=""
            width={25}
            height={32}
            priority
            className="h-8 w-auto"
          />
          <Image
            src="/logo-wordmark.png"
            alt="Paprivo"
            width={92}
            height={24}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  active ? activePill : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {signedIn && (
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/dashboard" ? activePill : "text-foreground/70 hover:text-foreground hover:bg-white/5"
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-20 rounded-lg bg-white/10 animate-pulse" />
          ) : signedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-foreground hover:border-accent2-bright transition-colors flex items-center gap-2"
              >
                <span className="max-w-28 truncate">{name ?? email}</span>
                <span aria-hidden>▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#1b2740] shadow-xl p-2 text-sm text-foreground">
                  <p className="px-2 py-1 text-muted truncate">{email}</p>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-2 py-1.5 rounded-lg hover:bg-white/10"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/onboarding"
                    onClick={() => setMenuOpen(false)}
                    className="block px-2 py-1.5 rounded-lg hover:bg-white/10"
                  >
                    Edit subjects
                  </Link>
                  <button
                    onClick={signOutNow}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 text-on-card"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className="h-8 px-3 rounded-lg border border-white/15 bg-white/5 text-sm text-foreground flex items-center hover:border-accent2-bright transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="h-8 px-3 rounded-lg bg-accent text-white text-sm flex items-center font-medium hover:bg-accent-soft transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex gap-1 overflow-x-auto px-4 pb-2 text-sm">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                active ? activePill : "text-foreground/70"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {signedIn && (
          <Link
            href="/dashboard"
            className={`px-3 py-1 rounded-lg whitespace-nowrap ${
              pathname === "/dashboard" ? activePill : "text-foreground/70"
            }`}
          >
            Dashboard
          </Link>
        )}
      </nav>
    </header>
  );
}
