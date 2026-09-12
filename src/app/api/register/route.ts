import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid email and a password of at least 8 characters." }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  const normalized = email.trim().toLowerCase();

  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with this email already exists. Try signing in instead." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({ email: normalized, name: name ?? normalized.split("@")[0], passwordHash });

  return NextResponse.json({ ok: true });
}
