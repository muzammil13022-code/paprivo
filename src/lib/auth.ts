import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/**
 * Auth.js v5 with a Credentials provider (email + password, bcrypt hashed).
 * JWT session strategy so no session table is needed.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Credentials-only app: we rely on our own cookie/session handling.
  // Vercel sets AUTH_URL; locally the explicit trust avoids UntrustedHost errors.
  trustHost: true,
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const db = await getDb();
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = rows[0];
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: String(user.id), name: user.name ?? user.email.split("@")[0], email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = Number(user.id);
      return token;
    },
    session({ session, token }) {
      if (token.uid != null) session.user.id = String(token.uid);
      return session;
    },
  },
});
