import Link from "next/link";
import { HomeSubjects } from "@/components/HomeSubjects";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { ProgressRing } from "@/components/ProgressRing";
import { totalPaperCount } from "@/lib/subjects";
import { papersData } from "@/types";

/* A sheet of the answer booklet: ruled rows, a tick column, mark brackets.
   Decorative — it mirrors the real paper rows on a subject page. */
function AnswerBookletPreview() {
  const rows = [
    { code: "WMA11", session: "June 2024", done: true },
    { code: "WMA12", session: "June 2024", done: true },
    { code: "WMA11", session: "January 2024", done: false },
    { code: "WMA13", session: "October 2023", done: false },
  ];
  return (
    <div className="relative border-t border-card-border lg:border-t-0 lg:border-l" aria-hidden>
      <div className="px-5 sm:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-graphite">Pure Mathematics 1 · WMA11</p>
            <p className="font-display text-base font-semibold mt-0.5">Your progress</p>
          </div>
          <ProgressRing done={35} total={56} size={46} stroke={5} />
        </div>

        <ul className="mt-5 border-t border-card-border">
          {rows.map((r) => (
            <li
              key={`${r.code}-${r.session}`}
              className="flex items-center gap-3 border-b border-card-border py-2.5"
            >
              <span className={`tick ${r.done ? "tick-on" : ""}`}>
                {r.done ? (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6.4 4.6 9 10 3.2" />
                  </svg>
                ) : null}
              </span>
              <span className="text-sm mark flex-1">
                <span className="font-medium">{r.code}</span>
                <span className="text-graphite"> · {r.session}</span>
              </span>
              <span className="doc-btn">QP</span>
              <span className="doc-btn">MS</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-graphite">
          Ticked papers are saved in this browser. No account, no email.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const total = totalPaperCount();
  const years = `${papersData.yearMin}–${papersData.yearMax}`;

  return (
    <div>
      {/* ---------------- Cover sheet ---------------- */}
      <section className="-mt-8 pt-8 pb-14">
        <div className="anim-rise rounded-2xl border border-card-border bg-card text-on-card">
          {/* Header band, as printed across the top of a paper */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-card-border px-5 sm:px-8 py-3 text-xs text-graphite">
            <span>Pearson Edexcel International AS / A Level</span>
            <span className="mark">
              {years} · {total.toLocaleString("en-GB")} papers
            </span>
          </div>

          <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
            <div className="flex flex-col justify-center px-5 sm:px-8 py-8 sm:py-9">
              <h1 className="font-display text-[2.6rem] sm:text-[3.3rem] lg:text-[3.6rem] font-bold tracking-[-0.035em] leading-[0.96]">
                Past papers,
                <br />
                ticked off.
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-graphite">
                Every International AS/A Level paper, mark scheme and examiner report for
                Mathematics, Physics, Chemistry and Biology, {years}. Work through them in order and
                tick each one off as you finish it.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="#subjects" className="btn-primary h-11 px-5 text-sm">
                  Browse subjects
                </Link>
                <Link
                  href="#find-question"
                  className="inline-flex h-11 items-center rounded-[3px] border border-card-border-strong px-5 text-sm font-medium transition-colors hover:border-accent"
                >
                  Find a question
                </Link>
              </div>
            </div>

            <AnswerBookletPreview />
          </div>

          {/* Rubric: the three blocks every Edexcel paper carries */}
          <dl className="grid border-t border-card-border sm:grid-cols-3">
            {[
              {
                term: "Instructions",
                body: "Open a subject, pick a session, and tick the papers you have sat. Progress is kept in this browser.",
              },
              {
                term: "Information",
                body: `${total.toLocaleString("en-GB")} papers with mark schemes and examiner reports, ${years}, across four subjects. Free, no ads, nothing to sign up for.`,
              },
              {
                term: "Advice",
                body: "Papers open in a new tab and download under their own names, so your folder stays in order.",
              },
            ].map((item, i) => (
              <div
                key={item.term}
                className={`px-5 sm:px-8 py-5 ${i > 0 ? "border-t border-card-border sm:border-t-0 sm:border-l" : ""}`}
              >
                <dt className="rubric-term">{item.term}</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-graphite">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- Find Your Question ---------------- */}
      <div id="find-question" className="scroll-mt-24">
        <UnifiedSearch />
      </div>

      {/* ---------------- Subjects ---------------- */}
      <section id="subjects" className="mt-16 sm:mt-20 scroll-mt-24">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-[2rem] font-semibold tracking-tight">
              Choose your subject
            </h2>
            <p className="text-muted mt-1.5">
              Papers, mark schemes and examiner reports, unit by unit.
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
        <div className="border-l-2 border-accent pl-5 max-w-3xl text-sm text-muted leading-relaxed">
          <p>
            <strong className="text-foreground font-medium">Why no PDFs are hosted here:</strong>{" "}
            papers are Pearson&apos;s copyrighted property. This site indexes Pearson&apos;s own
            public catalogue and deep-links to the official files on qualifications.pearson.com, so
            every link is legitimate and stays up to date. The most recent sessions may require a
            free Pearson sign-in (marked with a lock).
          </p>
        </div>
      </section>
    </div>
  );
}
