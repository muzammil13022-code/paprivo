import Link from "next/link";
import { HomeSubjects } from "@/components/HomeSubjects";
import { FindYourQuestion } from "@/components/FindYourQuestion";
import { ProgressRing } from "@/components/ProgressRing";
import { totalPaperCount } from "@/lib/subjects";
import { papersData } from "@/types";

function HeroPreviewCard() {
  // Decorative product preview — mirrors the real subject-page paper rows
  const rows = [
    { label: "June 2024", code: "WMA11", done: true, star: true },
    { label: "June 2024", code: "WMA12", done: true, star: false },
    { label: "January 2024", code: "WMA11", done: false, star: true },
  ];
  return (
    <div className="relative anim-scale stagger-3" aria-hidden>
      {/* glow + floating shapes */}
      <div className="absolute -inset-6 pointer-events-none">
        <div className="anim-glow absolute right-0 top-6 w-56 h-56 rounded-full bg-accent/40 blur-[80px]" />
        <div className="absolute -left-4 bottom-2 w-24 h-24 rounded-2xl border border-white/10 rotate-12" />
        <div className="absolute right-8 -bottom-6 w-16 h-16 rounded-full border border-accent2-bright/30" />
      </div>

      <div className="anim-float relative rounded-2xl border border-white/10 bg-background-soft/90 backdrop-blur p-5 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Pure Mathematics P1 · WMA11</p>
            <p className="font-semibold mt-0.5">Your revision, tracked</p>
          </div>
          <ProgressRing done={35} total={56} size={52} stroke={6} />
        </div>
        <div className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] ${
                  r.done ? "bg-accent2 border-accent2 text-white" : "border-white/25"
                }`}
              >
                {r.done ? "✓" : ""}
              </span>
              <span className="text-sm flex-1">
                {r.code} · {r.label}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={r.star ? "var(--accent2-bright)" : "none"}
                stroke={r.star ? "var(--accent2-bright)" : "rgba(248,250,252,0.3)"}
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" />
              </svg>
              <span className="doc-btn !bg-white/[0.06] !border-white/15 !text-foreground">QP</span>
              <span className="doc-btn !bg-white/[0.06] !border-white/15 !text-foreground">MS</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const total = totalPaperCount();
  const years = `${papersData.yearMin}–${papersData.yearMax}`;

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative -mt-8 pt-8 pb-14 sm:pb-16 overflow-hidden">
        {/* backdrop: dot grid + soft light */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(248,250,252,0.045) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 55%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent)",
          }}
        />
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[360px] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1.05fr,0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="anim-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent2-bright" aria-hidden />
              Every Pearson Edexcel IAL paper, {years}
            </span>
            <h1 className="anim-rise stagger-1 mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">
              Past papers.
              <br />
              <span
                style={{
                  background: "linear-gradient(92deg, #f8fafc 30%, var(--accent2-bright) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Better preparation.
              </span>
            </h1>
            <p className="anim-rise stagger-2 mt-4 text-muted max-w-xl leading-relaxed">
              Every Pearson Edexcel International AS/A Level past paper — Mathematics (P1–P4,
              M1–M3, S1–S3), Physics, Chemistry and Biology, {years}. Pick your subjects, tick papers off as
              you work through them, and bookmark the ones you revisit.
            </p>
            <p className="anim-rise stagger-2 mt-2 text-sm text-muted">
              {total} papers, linked straight to Pearson&apos;s own PDFs. Free, and no ads.
            </p>
            <div className="anim-rise stagger-3 mt-6 flex flex-wrap gap-3">
              <Link href="#subjects" className="btn-primary h-11 px-6 text-sm">
                Browse papers
              </Link>
              <Link href="#find-question" className="btn-secondary h-11 px-6 text-sm">
                Find a question
              </Link>
            </div>
          </div>

          <HeroPreviewCard />
        </div>
      </section>

      {/* ---------------- Find Your Question ---------------- */}
      <div id="find-question" className="scroll-mt-24">
        <FindYourQuestion />
      </div>

      {/* ---------------- Subjects ---------------- */}
      <section id="subjects" className="mt-16 sm:mt-20 scroll-mt-24">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Choose your subject</h2>
            <p className="text-muted mt-1.5">
              Track progress and bookmark papers — saved right in your browser, no account needed.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="hidden sm:inline-flex btn-secondary h-10 px-4 text-sm shrink-0"
          >
            Edit subjects
          </Link>
        </div>
        <HomeSubjects />
      </section>

      {/* ---------------- Pearson note ---------------- */}
      <section className="mt-14 sm:mt-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 text-sm text-muted leading-relaxed">
          <p>
            <strong className="text-foreground">Why no PDFs are hosted here:</strong> papers are
            Pearson&apos;s copyrighted property. This site indexes Pearson&apos;s own public catalogue and
            deep-links to the official files on qualifications.pearson.com, so every link is legitimate
            and stays up to date. The most recent sessions may require a free Pearson sign-in (marked
            with a lock).
          </p>
        </div>
      </section>
    </div>
  );
}
