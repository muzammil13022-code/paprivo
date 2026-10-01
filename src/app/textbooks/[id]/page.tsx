import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TextbookViewer } from "@/components/TextbookViewer";
import { resourceById } from "@/lib/resources";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const resource = resourceById(id);
  if (!resource || resource.resourceType !== "textbook") return { title: "Textbook" };
  return {
    title: resource.title,
    description: resource.description ?? undefined,
  };
}

export default async function TextbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = resourceById(id);
  if (!resource || resource.resourceType !== "textbook" || !resource.fileUrl) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            <Link href="/resources" className="hover:text-accent2-bright underline underline-offset-2">
              Resource Library
            </Link>{" "}
            / Textbook
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{resource.title}</h1>
          {resource.license && (
            <p className="text-xs text-muted mt-0.5">
              License: {resource.license}
              {resource.originalSource ? ` · Source: ${resource.originalSource}` : ""}
            </p>
          )}
        </div>
        <Link href="/resources" className="btn-secondary h-9 px-4 text-sm shrink-0">
          Back to library
        </Link>
      </div>

      <TextbookViewer fileUrl={resource.fileUrl} title={resource.title} />
    </div>
  );
}
