"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

interface Props {
  /** What the student is looking at, e.g. "WBI11" — used in the mail subject. */
  context?: string;
  className?: string;
}

/**
 * Invites students to send in a video, notes or paper we do not list yet.
 *
 * The mailto button only works where a mail app is configured, so the address
 * is also offered as a one-click copy for laptops that have none.
 * The address lives in src/lib/site.ts so it changes in one place.
 */
export function SubmitResource({ context, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const subject = context
    ? `Resource suggestion for ${context} — Paprivo`
    : "Resource suggestion — Paprivo";
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      // Older browsers or a non-secure context: copy from a hidden field.
      const field = document.createElement("textarea");
      field.value = CONTACT_EMAIL;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.top = "-1000px";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
      } catch {
        // Nothing else to try; the address is still visible on screen.
      }
      document.body.removeChild(field);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  }

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
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <a className="btn-primary" href={href}>
          Email {CONTACT_EMAIL}
        </a>
        <button type="button" onClick={copyAddress} className="btn-secondary">
          {copied ? "Address copied" : "Copy address"}
        </button>
        <span className="text-xs text-muted" role="status" aria-live="polite">
          {copied
            ? `${CONTACT_EMAIL} copied — paste it into your email app.`
            : `No mail app? Copy ${CONTACT_EMAIL} and send from any email service.`}
        </span>
      </div>
      <p className="text-xs text-muted mt-2">
        Include the unit code and the topic or question it covers.
      </p>
    </section>
  );
}
