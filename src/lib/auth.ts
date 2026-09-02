import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/lib/permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findFirst({
          where: { email, isActive: true },
          include: {
            userRoles: { include: { role: true } },
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const permissions = await getUserPermissions(user.id);
        const roles = user.userRoles.map((ur) => ur.role.code);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          roles,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as { tenantId: string }).tenantId;
        token.roles = (user as { roles: string[] }).roles;
        token.permissions = (user as { permissions: string[] }).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
