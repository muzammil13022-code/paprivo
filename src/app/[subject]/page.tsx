import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isSubjectKey, SUBJECTS, catalogueSubject } from "@/lib/subjects";
import { SubjectBrowser } from "@/components/SubjectBrowser";

export function generateStaticParams() {
  return [
    { subject: "mathematics" },
    { subject: "physics" },
    { subject: "chemistry" },
    { subject: "biology" },
  ];
}export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
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
            This is a new specification — papers will appear as the first exam sessions complete.
          </p>
        </section>
      )}
    </div>
  );
}
