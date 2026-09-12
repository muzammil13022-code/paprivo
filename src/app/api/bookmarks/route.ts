import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parsePaperId, paperIdSchema } from "@/lib/papers";
import { getDb } from "@/db";
import { bookmarks } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const patchSchema = z.object({
  id: paperIdSchema,
  starred: z.boolean(),
});

/** POST /api/bookmarks — star/unstar a paper */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { id, starred } = parsed.data;
  if (parsePaperId(id) === null) {
    return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });
  }

  const db = await getDb();
  if (starred) {
    await db.insert(bookmarks).values({ userId, paperId: id }).onConflictDoNothing();
  } else {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.paperId, id)));
  }
  return NextResponse.json({ ok: true });
}
