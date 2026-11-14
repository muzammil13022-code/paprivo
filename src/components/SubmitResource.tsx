import { CONTACT_EMAIL } from "@/lib/site";

interface Props {
  /** What the student is looking at, e.g. "WBI11" — used in the mail subject. */
  context?: string;
  className?: string;
}

/**
 * Invites students to send in a video, notes or paper we do not list yet.
 * The address lives in src/lib/site.ts so it changes in one place.
 */
export function SubmitResource({ context, className = "" }: Props) {
  const subject = context
    ? `Resource suggestion for ${context} — Paprivo`
    : "Resource suggestion — Paprivo";
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <section
      aria-labelledby="submit-resource"
      className={`rounded-2xl border border-card-border bg-card p-5 shadow-card-sm ${className}`}
    >
      <h2 id="submit-resource" className="text-lg font-semibold">
        Found a resource we&apos;re missing?
      </h2>
      <p className="text-sm text-muted mt-1.5 max-w-2xl">
        If you have a video, set of notes, or paper that helps with this and isn&apos;t on Paprivo
        yet, send it over and we&apos;ll check it and add it for everyone.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a className="btn-primary" href={href}>
          Email {CONTACT_EMAIL}
        </a>
        <span className="text-xs text-muted">Include the unit code and the topic or question it covers.</span>
      </div>
    </section>
  );
}
