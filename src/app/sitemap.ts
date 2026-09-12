import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ial-papers.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now },
    { url: `${siteUrl}/mathematics`, lastModified: now },
    { url: `${siteUrl}/physics`, lastModified: now },
    { url: `${siteUrl}/chemistry`, lastModified: now },
    { url: `${siteUrl}/biology`, lastModified: now },
    { url: `${siteUrl}/computer-science`, lastModified: now },
  ];
}
