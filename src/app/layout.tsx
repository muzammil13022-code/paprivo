import type { Metadata, Viewport } from "next";
import { Geist, Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { UserStateProvider } from "@/lib/state";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ial-papers.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Paprivo — Edexcel IAL Past Papers, 2019–2026",
    template: "%s · Paprivo",
  },
  description:
    "Every Pearson Edexcel International AS/A Level past paper, mark scheme and examiner report for Maths (P1 P2 M1 M2 S1 S2), Physics, Chemistry and Biology, 2019–2026. Track your progress, bookmark papers, pick your subjects.",
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
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <UserStateProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
          <footer className="border-t border-card-border py-6 mt-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-muted flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <p>
                Paprivo is not affiliated with Pearson. All papers and mark schemes © Pearson
                Edexcel — links open the official qualifications.pearson.com site.
              </p>
              <p className="shrink-0">
                Catalogue: 2019–{new Date().getFullYear() >= 2026 ? 2026 : new Date().getFullYear()}
              </p>
              <p className="shrink-0">Made for students, by students.</p>
            </div>
          </footer>
        </UserStateProvider>
      </body>
    </html>
  );
}
