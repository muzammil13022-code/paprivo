import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userSubjects, paperProgress, bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { migrateSchema } from "@/lib/papers";
import { auth } from "@/lib/auth";

/**
 * POST /api/migrate — called right after a successful first sign-in/sign-up.
 * Promotes guest state (localStorage) into the account. Idempotent.
 */
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
  const parsed = migrateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { subjectKeys, progress, bookmarks: marks } = parsed.data;
  const db = await getDb();

  await db.transaction(async (tx) => {
    // subjects: only set when the account has none yet
    const existingSubjects = await tx
      .select({ key: userSubjects.subjectKey })
      .from(userSubjects)
      .where(eq(userSubjects.userId, userId));
    if (existingSubjects.length === 0 && subjectKeys.length > 0) {
      await tx.insert(userSubjects).values(subjectKeys.map((key) => ({ userId, subjectKey: key })));
    }

    if (progress.length > 0) {
      await tx
        .insert(paperProgress)
        .values(progress.map((id) => ({ userId, paperId: id })))
        .onConflictDoNothing();
    }
    if (marks.length > 0) {
      await tx
        .insert(bookmarks)
        .values(marks.map((id) => ({ userId, paperId: id })))
        .onConflictDoNothing();
    }
  });

  return NextResponse.json({ ok: true });
}
