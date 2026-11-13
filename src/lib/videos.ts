import videosJson from "@/data/videos.json";

/**
 * Topic video library data layer.
 *
 * Built by scripts/build-videos.mjs from the open Syllabus library
 * (edexcel-library.vercel.app), which groups picks by Pearson spec topic.
 * Every id was re-checked against YouTube's oEmbed endpoint before shipping,
 * so a listed video always exists; a topic with no verified pick is empty
 * rather than padded.
 */
export interface TopicVideo {
  i: string;
  t: string;
  c: string;
  tags: string[];
}

export interface VideoSection {
  name: string;
  summary: string;
  slug: string;
  videos: TopicVideo[];
}

interface VideosData {
  generatedAt: string;
  source: string;
  note: string;
  units: Record<string, VideoSection[]>;
}

const data = videosJson as unknown as VideosData;

export const VIDEO_SOURCE = data.source;
export const VIDEO_NOTE = data.note;

export function videoSectionsOf(unitCode: string): VideoSection[] {
  return data.units[unitCode.toUpperCase()] ?? [];
}

export function videoCountOf(unitCode: string): number {
  return videoSectionsOf(unitCode).reduce((n, s) => n + s.videos.length, 0);
}

export function hasVideos(unitCode: string): boolean {
  return videoCountOf(unitCode) > 0;
}

export function watchUrl(video: TopicVideo): string {
  return `https://www.youtube.com/watch?v=${video.i}`;
}

export function thumbnailUrl(video: TopicVideo): string {
  return `https://i.ytimg.com/vi/${video.i}/hqdefault.jpg`;
}
