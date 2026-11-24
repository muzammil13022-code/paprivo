import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Libre_Franklin } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { UserStateProvider } from "@/lib/state";

/* Display: tight, squared grotesque for cover titles and section heads. */
const display = Familjen_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/* Body: Franklin gothic, the vernacular of printed exam sheets. */
const body = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paprivo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Paprivo — Edexcel IAL Past Papers, 2019–2026",
    template: "%s · Paprivo",
  },
  description:
    "Every Pearson Edexcel International AS/A Level past paper, mark scheme and examiner report for Maths (P1 P2 M1 M2 S1 S2), Physics, Chemistry and Biology, 2019–2026. Track your progress and bookmark papers — no account needed.",
  keywords: [
    "Edexcel past papers",
    "IAL past papers",
    "International A Level",
    "WMA11",
    "WPH11",
    "WCH11",
    "WBI11",
    "past papers 2019",
    "mark schemes",
  ],
  openGraph: {
    title: "Paprivo — Edexcel IAL Past Papers",
    description:
      "All Edexcel IAL past papers, mark schemes and examiner reports 2019–2026, with progress tracking and bookmarks.",
    url: siteUrl,
    siteName: "Paprivo",
    type: "website",
    images: ["/logo-full.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paprivo — Edexcel IAL Past Papers",
    description: "All Edexcel IAL past papers 2019–2026, with progress tracking and bookmarks.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1A1E17",
};

const FOOTER_SUBJECTS = [
  { href: "/mathematics", label: "Mathematics" },
  { href: "/physics", label: "Physics" },
  { href: "/chemistry", label: "Chemistry" },
  { href: "/biology", label: "Biology" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <UserStateProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
          <footer className="mt-14 border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                  <div className="flex items-center gap-2">
                    <Image src="/logo-mark.png" alt="" width={25} height={32} className="h-6 w-auto" />
                    <p className="font-display text-lg font-semibold tracking-tight">Paprivo</p>
                  </div>
                  <p className="text-sm text-muted mt-3 max-w-sm leading-relaxed">
                    Every Pearson Edexcel International AS/A Level past paper, mark scheme and
                    examiner report, 2019–2026 — with progress tracking that lives in your browser.
                  </p>
                </div>
                <nav aria-label="Subjects">
                  <p className="text-sm font-medium mb-3">Subjects</p>
                  <ul className="space-y-2 text-sm">
                    {FOOTER_SUBJECTS.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className="text-foreground/80 hover:text-accent2-bright transition-colors"
                        >
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <nav aria-label="Tools">
                  <p className="text-sm font-medium mb-3">Tools</p>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link
                        href="/onboarding"
                        className="text-foreground/80 hover:text-accent2-bright transition-colors"
                      >
                        Choose subjects
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/#find-question"
                        className="text-foreground/80 hover:text-accent2-bright transition-colors"
                      >
                        Find your question
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
              <div className="border-t border-white/10 mt-9 pt-5 text-xs text-muted flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <p>
                  Paprivo is not affiliated with Pearson. All papers and mark schemes © Pearson
                  Edexcel — links open the official qualifications.pearson.com site.
                </p>
                <p className="shrink-0">Made for students, by students.</p>
              </div>
            </div>
          </footer>
        </UserStateProvider>
      </body>
    </html>
  );
}
