import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { admins, students } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  userType: z.enum(["admin", "student"]),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userType: { label: "User Type", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password, userType } = parsed.data;

        if (userType === "admin") {
          const admin = await db
            .select()
            .from(admins)
            .where(eq(admins.email, email))
            .limit(1);

          if (admin.length === 0) {
            return null;
          }

          const isValid = await compare(password, admin[0].passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: admin[0].id.toString(),
            email: admin[0].email,
            name: admin[0].name,
            role: admin[0].role,
            userType: "admin" as const,
          };
        } else {
          const student = await db
            .select()
            .from(students)
            .where(eq(students.email, email))
            .limit(1);

          if (student.length === 0 || !student[0].passwordHash) {
            return null;
          }

          const isValid = await compare(password, student[0].passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: student[0].id.toString(),
            email: student[0].email,
            name: student[0].name,
            role: "student" as const,
            userType: "student" as const,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
      }

      // Google OAuth の場合
      if (account?.provider === "google") {
        // アクセストークンを保存
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;

        // まず管理者かチェック
        const admin = await db
          .select()
          .from(admins)
          .where(eq(admins.email, token.email!))
          .limit(1);

        if (admin.length > 0) {
          token.id = admin[0].id.toString();
          token.role = admin[0].role;
          token.userType = "admin";
        } else {
          // 生徒かチェック
          const student = await db
            .select()
            .from(students)
            .where(eq(students.email, token.email!))
            .limit(1);

          if (student.length > 0) {
            token.id = student[0].id.toString();
            token.role = "student";
            token.userType = "student";
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as "admin" | "student";
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Google OAuth の場合、既存の管理者または生徒のみログイン可能
      if (account?.provider === "google") {
        const admin = await db
          .select()
          .from(admins)
          .where(eq(admins.email, user.email!))
          .limit(1);

        if (admin.length > 0) {
          return true;
        }

        const student = await db
          .select()
          .from(students)
          .where(eq(students.email, user.email!))
          .limit(1);

        if (student.length === 0) {
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

declare module "next-auth" {
  interface User {
    role?: string;
    userType?: "admin" | "student";
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
      userType: "admin" | "student";
    };
    accessToken?: string;
  }

  interface JWT {
    id?: string;
    role?: string;
    userType?: "admin" | "student";
    accessToken?: string;
    refreshToken?: string;
  }
}
