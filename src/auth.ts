import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [Credentials({
    async authorize(raw) {
      const p = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(raw);
      if (!p.success) return null;
      const u = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
      if (!u?.passwordHash || !(await bcrypt.compare(p.data.password, u.passwordHash))) return null;
      return { id: u.id, name: u.name, email: u.email };
    } })],
  callbacks: {
    jwt: ({ token, user }) => { if (user) token.uid = user.id; return token; },
    session: ({ session, token }) => { if (token.uid) session.user.id = token.uid as string; return session; },
  },
});
