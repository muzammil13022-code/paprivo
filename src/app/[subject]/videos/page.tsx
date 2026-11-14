import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS } from "@/lib/subjects";
import { topicUnitsOf } from "@/lib/topics";
import { videoCountOf, videoSectionsOf } from "@/lib/videos";

interface Props {
  params: Promise<{ subject: string }>;
}

export function generateStaticParams() {
  return [
    { subject: "mathematics" },
    { subject: "physics" },
    { subject: "chemistry" },
    { subject: "biology" },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  if (!isSubjectKey(subject)) return { title: "Not found" };
  const meta = SUBJECTS[subject];
  return {
    title: `${meta.label} videos`,
    description: `Video lessons for every ${meta.label} IAL unit, grouped by Pearson specification topic.`,
  };
}

export default async function SubjectVideosPage({ params }: Props) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  const meta = SUBJECTS[subject];
  const units = topicUnitsOf(subject);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">
          <Link href="/videos" className="hover:underline">
            Video library
          </Link>{" "}
          / {meta.label}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
          {meta.label} videos
        </h1>
        <p className="text-muted mt-1 max-w-2xl">
          Pick a unit to see its topics in specification order, with a lesson or two for each area.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {units.map((unit) => {
          const videos = videoCountOf(unit.code);
          const sections = videoSectionsOf(unit.code).length;
          return (
            <Link
              key={unit.code}
              href={`/${subject}/videos/${unit.code.toLowerCase()}`}
              className="card-interactive group rounded-2xl border border-card-border bg-card p-5 shadow-card-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{unit.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-card-border">
                  {unit.code}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">
                {videos > 0
                  ? `${videos} video${videos === 1 ? "" : "s"} · ${sections} topic area${sections === 1 ? "" : "s"}`
                  : "Video not available yet"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
