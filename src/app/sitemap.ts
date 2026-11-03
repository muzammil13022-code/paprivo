import type { MetadataRoute } from "next";
import { topicUnitsOf } from "@/lib/topics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ial-papers.vercel.app";
const subjects = ["mathematics", "physics", "chemistry", "biology"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = [
    { url: siteUrl, lastModified: now },
    { url: `${siteUrl}/topical`, lastModified: now },
    { url: `${siteUrl}/notes`, lastModified: now },
    { url: `${siteUrl}/resources`, lastModified: now },
    ...subjects.map((subject) => ({
      url: `${siteUrl}/resources/${subject}`,
      lastModified: now,
    })),
  ];

  const perSubject = subjects.flatMap((subject) => [
    { url: `${siteUrl}/${subject}`, lastModified: now },
    { url: `${siteUrl}/${subject}/topical`, lastModified: now },
    { url: `${siteUrl}/${subject}/notes`, lastModified: now },
    ...topicUnitsOf(subject).flatMap((unit) => [
      { url: `${siteUrl}/${subject}/topical/${unit.code.toLowerCase()}`, lastModified: now },
      { url: `${siteUrl}/${subject}/notes/${unit.code.toLowerCase()}`, lastModified: now },
    ]),
  ]);

  return [...base, ...perSubject];
}
