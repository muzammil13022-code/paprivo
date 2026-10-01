"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const resourceLinks = [
  { href: "/resources", label: "Resource Library", desc: "Search everything" },
  { href: "/resources/mathematics", label: "Maths", desc: "Papers · textbooks · spec" },
  { href: "/resources/physics", label: "Physics", desc: "Papers · textbooks · spec" },
  { href: "/resources/chemistry", label: "Chemistry", desc: "Papers · textbooks · spec" },
  { href: "/resources/biology", label: "Biology", desc: "Papers · textbooks · spec" },
];

const nav = [
  { href: "/", label: "Home" },
  { href: "/mathematics", label: "Maths" },
  { href: "/physics", label: "Physics" },
  { href: "/chemistry", label: "Chemistry" },
  { href: "/biology", label: "Biology" },
  { href: "/computer-science", label: "CS" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resRef = useRef<HTMLDivElement>(null);

  // Compact, more solid navbar once the user scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes (deferred so the
  // state update stays out of the synchronous effect path)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) setMenuOpen(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Close the resources dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (resRef.current && !resRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const pill = (active: boolean) =>
    active ? "bg-accent text-white font-medium shadow-card-sm" : "text-foreground/70 hover:text-foreground hover:bg-white/5";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-background/85 backdrop-blur-md shadow-[0_4px_24px_rgba(2,8,23,0.35)]"
          : "border-b border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 transition-all duration-300 ${scrolled ? "h-13" : "h-16"}`}>
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Paprivo home">
          <Image src="/logo-mark.png" alt="" width={25} height={32} priority className="h-8 w-auto" />
          <Image src="/logo-wordmark.png" alt="Paprivo" width={92} height={24} priority className="h-6 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 text-sm" aria-label="Primary">
          {nav.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""} px-3 py-1.5 rounded-lg transition-colors ${pill(isActive(item.href))}`}
            >
              {item.label}
            </Link>
))}

          {/* Resources dropdown */}
          <div className="relative" ref={resRef}>
            <button
              type="button"
              onClick={() => setResourcesOpen((v) => !v)}
              aria-expanded={resourcesOpen}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                pathname.startsWith("/resources")
                  ? "bg-accent text-white font-medium shadow-card-sm"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5"
              }`}
            >
              Resources
              <span
                aria-hidden
                className={`text-[10px] transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {resourcesOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#1b2740] shadow-lg p-2 text-sm anim-rise origin-top">
                {resourceLinks.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={() => setResourcesOpen(false)}
                    className="block px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="block text-xs text-muted">{r.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {nav.slice(3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""} px-3 py-1.5 rounded-lg transition-colors ${pill(isActive(item.href))}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/onboarding" className="hidden lg:inline-flex btn-primary h-9 px-4 text-sm">
            Choose subjects
          </Link>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="md:hidden h-9 w-9 rounded-lg border border-white/15 bg-white/5 flex items-center justify-center transition-colors hover:border-white/30"
          >
            <span className="relative block w-4 h-3" aria-hidden>
              <span
                className={`absolute left-0 top-0 w-4 h-0.5 rounded bg-foreground transition-all duration-300 ${
                  menuOpen ? "top-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 w-4 h-0.5 rounded bg-foreground transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-3 w-4 h-0.5 rounded bg-foreground transition-all duration-300 ${
                  menuOpen ? "top-1.5 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu — slides down smoothly */}
      <div
        className="md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: menuOpen ? "24rem" : "0rem", opacity: menuOpen ? 1 : 0 }}
      >
        <nav className="px-4 pb-4 pt-1 space-y-1 border-t border-white/10" aria-label="Mobile">
          {nav.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                transitionDelay: menuOpen ? `${i * 30}ms` : "0ms",
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "none" : "translateX(-8px)",
              }}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${pill(isActive(item.href))}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-white/10">
            <p className="px-3 pb-1 text-xs font-medium text-muted">Resources</p>
            {resourceLinks.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className={`block px-3 py-2.5 rounded-lg text-sm ${
                  pathname.startsWith(r.href) && r.href !== "/resources" ? pill(true) : pill(false)
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <Link href="/onboarding" className="btn-primary block px-3 py-2.5 text-sm text-center mt-2">
            Choose subjects
          </Link>
        </nav>
      </div>
    </header>
  );
}
