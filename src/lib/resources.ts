import resourcesJson from "@/data/resources.json";
import type { SubjectKey } from "@/lib/papers";
import { SUBJECTS } from "@/lib/subjects";

/**
 * Resource library data layer.
 *
 * Backed by src/data/resources.json today; the exported functions are the
 * seam for a real database/API later — swap the internals without touching
 * the UI. Search normalizes case/spacing and matches every term across
 * title, subject, topic, board and description.
 */

export type ResourceLevel = "as" | "a2" | "alevel";
export type ResourceType =
  | "past-paper"
  | "mark-scheme"
  | "topical-paper"
  | "textbook";
export type ResourceAccessType = "hosted" | "external";

export interface Resource {
  id: string;
  title: string;
  subject: SubjectKey | string;
  subjectCode: string | null;
  level: ResourceLevel | null;
  examBoard: string | null;
  topic: string | null;
  resourceType: ResourceType;
  year: number | null;
  session: string | null;
  paperNumber: string | null;
  variant: string | null;
  description: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  source: string | null;
  accessType: ResourceAccessType;
  /** Redistribution license for hosted resources (e.g. "CC0 1.0"); null = not claimed. */
  license?: string | null;
  /** Where the resource originally comes from, for attribution. */
  originalSource?: string | null;
}

export interface ResourceFilters {
  subject?: string;
  level?: ResourceLevel;
  type?: ResourceType;
  board?: string;
  topic?: string;
  year?: number;
}

interface ResourceCatalogue {
  note: string;
  resources: Resource[];
}

const catalogue = resourcesJson as unknown as ResourceCatalogue;

export const RESOURCE_LEVELS: Array<{ value: ResourceLevel; label: string }> = [
  { value: "as", label: "AS" },
  { value: "a2", label: "A2" },
  { value: "alevel", label: "Full A Level" },
];

export const RESOURCE_TYPES: Array<{ value: ResourceType; label: string }> = [
  { value: "past-paper", label: "Past papers" },
  { value: "topical-paper", label: "Topical papers" },
  { value: "textbook", label: "Textbooks" },
  { value: "mark-scheme", label: "Mark schemes" },
];

export function allResources(): Resource[] {
  return catalogue.resources;
}

export function resourceById(id: string): Resource | undefined {
  return catalogue.resources.find((r) => r.id === id);
}

/** Distinct, sorted values of a facet for filter UIs. */
export function resourceFacets(field: "subject" | "level" | "examBoard" | "resourceType" | "topic"): string[] {
  const set = new Set<string>();
  for (const r of catalogue.resources) {
    let v: unknown;
    if (field === "level") v = r.level;
    else if (field === "resourceType") v = r.resourceType;
    else if (field === "examBoard") v = r.examBoard;
    else if (field === "topic") v = r.topic;
    else v = r.subject;
    if (typeof v === "string" && v.length > 0) set.add(v);
  }
  return [...set].sort();
}

export function subjectLabelOf(subject: string): string {
  const known = SUBJECTS[subject as SubjectKey];
  return known ? known.label : subject;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/,]+/g, " ").trim();
}

/**
 * Unified resource search: every whitespace-separated term must match
 * somewhere in the searchable text; remaining filters must match exactly.
 */
export function searchResources(query: string, filters: ResourceFilters = {}): Resource[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  return allResources().filter((r) => {
    if (filters.subject && r.subject !== filters.subject) return false;
    if (filters.level && r.level !== filters.level) return false;
    if (filters.type && r.resourceType !== filters.type) return false;
    if (filters.board && normalize(r.examBoard ?? "") !== normalize(filters.board)) return false;
    if (filters.topic && normalize(r.topic ?? "") !== normalize(filters.topic)) return false;
    if (filters.year !== undefined && r.year !== filters.year) return false;
    if (terms.length === 0) return true;
    const haystack = normalize(
      [
        r.title,
        subjectLabelOf(r.subject),
        r.subjectCode ?? "",
        r.level ?? "",
        r.examBoard ?? "",
        r.topic ?? "",
        r.resourceType,
        r.description ?? "",
      ].join(" "),
    );
    return terms.every((t) => haystack.includes(t));
  });
}

/** Count of resources per category, for section headers and empty states. */
export function countByType(type: ResourceType, filters: ResourceFilters = {}): number {
  return searchResources("", { ...filters, type }).length;
}

/** Group resources by type while preserving RESOURCE_TYPES order. */
export function groupByType(resources: Resource[]): Map<ResourceType, Resource[]> {
  const map = new Map<ResourceType, Resource[]>();
  for (const { value } of RESOURCE_TYPES) map.set(value, []);
  for (const r of resources) {
    const bucket = map.get(r.resourceType);
    if (bucket) bucket.push(r);
  }
  return map;
}
