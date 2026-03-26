import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import getDb from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
          .get(credentials.email) as {
          id: number;
          name: string;
          email: string;
          password: string;
          company: string | null;
          company_id: number | null;
          role: string;
        } | undefined;

        if (!user) {
          return null;
        }

        const isValid = bcrypt.compareSync(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          company: user.company,
          companyId: user.company_id ? String(user.company_id) : null,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.company = (user as { company?: string }).company;
        token.companyId = (user as { companyId?: string | null }).companyId;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { company?: string }).company = token.company as string;
        (session.user as { companyId?: string | null }).companyId = token.companyId as string | null;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
