import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { userSubjects, paperProgress, bookmarks } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { subjectKeysSchema, batchSchema } from "@/lib/papers";
import { auth } from "@/lib/auth";

/** Shape of the client state we keep per user. */
interface MeState {
  signedIn: boolean;
  email?: string;
  name?: string;
  subjectKeys: string[];
  progress: string[];
  bookmarks: string[];
}

const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ signedIn: false, subjectKeys: [], progress: [], bookmarks: [] });
  }
  const userId = Number(session.user.id);
  const db = await getDb();

  const [subjects, progress, marks] = await Promise.all([
    db.select({ key: userSubjects.subjectKey }).from(userSubjects).where(eq(userSubjects.userId, userId)),
    db.select({ id: paperProgress.paperId }).from(paperProgress).where(eq(paperProgress.userId, userId)),
    db.select({ id: bookmarks.paperId }).from(bookmarks).where(eq(bookmarks.userId, userId)),
  ]);

  const state: MeState = {
    signedIn: true,
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
    subjectKeys: subjects.map((r) => r.key),
    progress: progress.map((r) => r.id),
    bookmarks: marks.map((r) => r.id),
  };
  return NextResponse.json(state);
}

/** Replace the user's subject selection wholesale. */
export async function POST(subjectsReq: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = Number(session.user.id);

  let body: unknown;
  try {
    body = await subjectsReq.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = z.object({ subjectKeys: subjectKeysSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subject list" }, { status: 400 });
  }

  const db = await getDb();
  const next = [...new Set(parsed.data.subjectKeys)];

  await db.transaction(async (tx) => {
    await tx.delete(userSubjects).where(eq(userSubjects.userId, userId));
    if (next.length > 0) {
      await tx.insert(userSubjects).values(next.map((key) => ({ userId, subjectKey: key })));
    }
  });

  return NextResponse.json({ ok: true, subjectKeys: next });
}

/** Apply progress/bookmark diffs: { add: string[], remove: string[] } */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = Number(session.user.id);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  }
  const { add, remove } = parsed.data;

  const kind = new URL(req.url).searchParams.get("kind") === "bookmarks" ? "bookmarks" : "progress";
  const table = kind === "bookmarks" ? bookmarks : paperProgress;
  const db = await getDb();

  if (remove.length > 0) {
    await db.delete(table).where(and(eq(table.userId, userId), inArray(table.paperId, remove)));
  }
  if (add.length > 0) {
    await db.insert(table).values(add.map((id) => ({ userId, paperId: id }))).onConflictDoNothing();
  }

  return NextResponse.json({ ok: true });
}
