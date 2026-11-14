import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, SUBJECTS } from "@/lib/subjects";
import { topicUnitOf, topicUnitsOf } from "@/lib/topics";
import {
  VIDEO_NOTE,
  VIDEO_SOURCE,
  thumbnailUrl,
  videoSectionsOf,
  watchUrl,
  type TopicVideo,
} from "@/lib/videos";
import { SubmitResource } from "@/components/SubmitResource";

interface Props {
  params: Promise<{ subject: string; unit: string }>;
}

export function generateStaticParams() {
  const out: Array<{ subject: string; unit: string }> = [];
  for (const s of ["mathematics", "physics", "chemistry", "biology"] as const) {
    for (const unit of topicUnitsOf(s)) {
      out.push({ subject: s, unit: unit.code.toLowerCase() });
    }
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) return { title: "Not found" };
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) return { title: "Not found" };
  const meta = SUBJECTS[subject];
  return {
    title: `${meta.label} ${unitData.code} videos`,
    description: `Video lessons for ${unitData.name} (${unitData.code}), Pearson Edexcel IAL, in specification order.`,
  };
}

export default async function UnitVideosPage({ params }: Props) {
  const { subject, unit } = await params;
  if (!isSubjectKey(subject)) notFound();
  const unitData = topicUnitOf(subject, unit);
  if (!unitData) notFound();

  const meta = SUBJECTS[subject];
  const sections = videoSectionsOf(unitData.code);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">
          <Link href={`/${subject}`} className="hover:underline">
            {meta.label}
          </Link>{" "}
          ·{" "}
          <Link href={`/${subject}/videos`} className="hover:underline">
            Videos
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {unitData.name}{" "}
          <span className="text-sm font-normal text-muted align-middle">({unitData.code})</span>
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Topics follow the specification order. Prefer reading?{" "}
          <Link href={`/${subject}/notes/${unitData.code.toLowerCase()}`} className="underline">
            Download the notes PDFs
          </Link>
          .
        </p>
      </header>

      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.slug} aria-labelledby={section.slug} className="space-y-3">
              <div>
                <h2 id={section.slug} className="text-lg font-semibold">
                  {section.name}
                </h2>
                {section.summary && section.summary !== unitData.name && (
                  <p className="text-sm text-muted mt-0.5">{section.summary}</p>
                )}
              </div>
              {section.videos.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.videos.map((video) => (
                    <li key={video.i}>
                      <VideoCard video={video} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted">
                  Video not available for this topic yet.
                </p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted">
          Video not available for this unit yet.
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted leading-relaxed">
        <p>
          <strong className="text-foreground">Video note.</strong> {VIDEO_NOTE}
        </p>
        <p className="mt-2">Sources: {VIDEO_SOURCE}.</p>
      </section>

      <SubmitResource context={`${meta.label} ${unitData.code}`} />
    </div>
  );
}

function VideoCard({ video }: { video: TopicVideo }) {
  const href = watchUrl(video);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-card-sm">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${video.t} on YouTube`}
        className="relative block aspect-video bg-[#0b1220]"
        style={{
          backgroundImage: `url(${thumbnailUrl(video)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white text-sm">
            ▶
          </span>
        </span>
      </a>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap gap-1">
          {video.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-card-border/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-sm font-medium leading-snug">{video.t}</h3>
        <p className="mt-auto text-xs text-muted">{video.c}</p>
      </div>
    </article>
  );
}
