import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
          include: { club: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const { compare } = await import("bcryptjs");
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          clubId: user.club?.id ?? null,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          await db.loginEvent.create({
            data: { userId: user.id },
          });
        } catch {
          // Non-critical — don't block login
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.clubId = (user as { clubId?: string | null }).clubId ?? null;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub ?? token.id) as string;
        (session.user as { clubId?: string | null }).clubId =
          token.clubId as string | null;
        (session.user as { role?: string }).role =
          token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
