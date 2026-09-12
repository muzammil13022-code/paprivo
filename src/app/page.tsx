import Image from "next/image";
import { HomeSubjects } from "@/components/HomeSubjects";
import { totalPaperCount } from "@/lib/subjects";
import { papersData } from "@/types";

export default function HomePage() {
  const total = totalPaperCount();
  const years = `${papersData.yearMin}–${papersData.yearMax}`;

  return (
    <div className="space-y-8">
      <section className="py-6">
        <h1>
          <Image
            src="/logo-full.png"
            alt="Paprivo — past papers. Better preparation."
            width={830}
            height={245}
            priority
            className="w-full max-w-xl h-auto"
          />
        </h1>
        <p className="mt-4 text-muted max-w-2xl">
          Every Pearson Edexcel International AS/A Level past paper — Mathematics (P1, P2, M1, M2,
          S1, S2), Physics, Chemistry and Biology, {years}. Pick your subjects, tick papers off as
          you work through them, and bookmark the ones you revisit.
        </p>
        <p className="mt-2 text-sm text-muted">
          {total} papers, linked straight to Pearson&apos;s own PDFs. Free, and no ads.
        </p>
      </section>

      <section>
        <HomeSubjects />
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-5 text-sm text-muted">
        <p>
          <strong>Why no PDFs are hosted here:</strong> papers are
          Pearson&apos;s copyrighted property. This site indexes Pearson&apos;s own public catalogue and
          deep-links to the official files on qualifications.pearson.com, so every link is legitimate
          and stays up to date. The most recent sessions may require a free Pearson sign-in (marked
          with a lock).
        </p>
      </section>
    </div>
  );
}
