import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parsePaperId, paperIdSchema } from "@/lib/papers";
import { getDb } from "@/db";
import { paperProgress } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

const patchSchema = z.object({
  id: paperIdSchema,
  done: z.boolean(),
});

/** POST /api/progress — toggle one paper's done state */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
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
  const { id, done } = parsed.data;
  if (parsePaperId(id) === null) {
    return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });
  }

  const db = await getDb();
  if (done) {
    await db.insert(paperProgress).values({ userId, paperId: id }).onConflictDoNothing();
  } else {
    await db.delete(paperProgress).where(and(eq(paperProgress.userId, userId), eq(paperProgress.paperId, id)));
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/progress?ids=a,b — bulk clear (dashboard reset button) */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = Number(session.user.id);
  const idsParam = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter((s) => parsePaperId(s) !== null);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid ids" }, { status: 400 });
  }
  const db = await getDb();
  await db.delete(paperProgress).where(and(eq(paperProgress.userId, userId), inArray(paperProgress.paperId, ids)));
  return NextResponse.json({ ok: true });
}
