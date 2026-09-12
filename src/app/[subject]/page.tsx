import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isSubjectKey, SUBJECTS, catalogueSubject, CS_RESOURCES } from "@/lib/subjects";
import { SubjectBrowser } from "@/components/SubjectBrowser";

export function generateStaticParams() {
  return [
    { subject: "mathematics" },
    { subject: "physics" },
    { subject: "chemistry" },
    { subject: "biology" },
    { subject: "computer-science" },
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const { subject } = await params;
  if (!isSubjectKey(subject)) return { title: "Not found" };
  const meta = SUBJECTS[subject];
  return {
    title: `${meta.label} past papers`,
    description: `Pearson Edexcel International A Level ${meta.label} past papers, mark schemes and examiner reports 2019–2026. ${meta.unitsLine}.`,
  };
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  const meta = SUBJECTS[subject];
  const catalogue = catalogueSubject(subject);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{meta.label}</h1>
          <p className="text-muted mt-1">
            Pearson Edexcel International AS/A Level · {meta.unitsLine}
          </p>
        </div>
        <span className="text-4xl" aria-hidden>
          {meta.glyph}
        </span>
      </header>

      {catalogue ? (
        <SubjectBrowser subject={catalogue} />
      ) : (
        <section className="rounded-2xl border border-card-border bg-card p-6 sm:p-8 max-w-2xl">
          <h2 className="text-lg font-semibold">No past papers yet — by design, not by omission</h2>
          <p className="mt-2 text-muted text-sm leading-relaxed">
            IAL Computer Science is a brand-new Pearson specification first taught from September 2026,
            with the first exams in <strong>June 2027 (IAS)</strong> and{" "}
            <strong>June 2028 (IAL)</strong>. Once the June 2027 session has
            run, its papers will appear here automatically after a catalogue refresh.
          </p>
          <p className="mt-3 text-muted text-sm">Until then, the official sources:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="doc-btn" href={CS_RESOURCES.spec} target="_blank" rel="noopener noreferrer">
              📘 Specification (PDF) ↗
            </a>
            <a className="doc-btn" href={CS_RESOURCES.sample} target="_blank" rel="noopener noreferrer">
              🧪 Sample assessment materials ↗
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">
            Tip: your teachers may also have secure practice/mock material in Pearson&apos;s ActiveHub.
          </p>
        </section>
      )}
    </div>
  );
}
