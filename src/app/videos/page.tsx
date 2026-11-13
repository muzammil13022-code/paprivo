import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SUBJECTS, SUBJECT_ORDER } from "@/lib/subjects";
import { topicUnitsOf } from "@/lib/topics";
import { VIDEO_NOTE, VIDEO_SOURCE, videoCountOf } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Video library",
  description:
    "Specification-ordered video lessons for Pearson Edexcel International A Level Maths, Physics, Chemistry and Biology — grouped by unit and topic.",
};

export default function VideosPage() {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-accent/20 blur-[110px] pointer-events-none"
        />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Video library</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Follow the specification instead of a search results page: each unit is broken down by
            topic, with one or two hand-picked videos per area and an honest gap where nothing good
            exists yet.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUBJECT_ORDER.map((key, i) => {
          const meta = SUBJECTS[key];
          const units = topicUnitsOf(key);
          const videos = units.reduce((n, u) => n + videoCountOf(u.code), 0);
          const covered = units.filter((u) => videoCountOf(u.code) > 0).length;
          return (
            <Reveal key={key} delay={(i % 2) * 80}>
              <Link
                href={`/${key}/videos`}
                className="card-interactive flex h-full flex-col gap-2 rounded-2xl border border-card-border bg-card p-5 shadow-card-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{meta.label}</h2>
                  <span className="card-glyph text-2xl text-accent opacity-80" aria-hidden>
                    {meta.glyph}
                  </span>
                </div>
                <p className="text-sm text-muted">{meta.unitsLine}</p>
                <p className="mt-1 text-sm">
                  <span className="font-medium">{videos}</span>{" "}
                  <span className="text-muted">videos</span> ·{" "}
                  <span className="text-muted">
                    {covered} of {units.length} units covered
                  </span>
                </p>
                <span className="mt-2 text-sm underline underline-offset-2">
                  Open {meta.label} videos
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted leading-relaxed">
        <p>
          <strong className="text-foreground">How these are picked.</strong> Videos are grouped by
          specification topic, prefer one clear lesson per area, and every link is checked against
          YouTube before it is listed — a topic with no suitable video is left empty instead of
          padded. {VIDEO_NOTE}
        </p>
        <p className="mt-2">Sources: {VIDEO_SOURCE}.</p>
      </section>
    </div>
  );
}
